import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils/GeoUtils';

export interface PaceAnalysis {
  splits: KilometerSplit[];
  fastestSplit: KilometerSplit | null;
  slowestSplit: KilometerSplit | null;
  averagePace: number;
  paceConsistency: number;
  positiveNegativeSplit: 'positive' | 'negative' | 'even';
  paceZones: PaceZoneAnalysis;
  performanceMetrics: PerformanceMetrics;
}

export interface KilometerSplit {
  kilometer: number;
  pace: number; // seconds per km
  time: number; // seconds from start
  cumulativeTime: number; // total time up to this split
  distance: number; // actual distance of this segment
  startPoint: GPSPoint;
  endPoint: GPSPoint;
  elevationGain: number;
  elevationLoss: number;
}

export interface PaceZoneAnalysis {
  zones: PaceZone[];
  timeInZones: { [zoneName: string]: number };
  percentageInZones: { [zoneName: string]: number };
}

export interface PaceZone {
  name: 'Easy' | 'Moderate' | 'Hard' | 'Maximum';
  minPace: number; // seconds per km
  maxPace: number; // seconds per km
  color: string;
  description: string;
}

export interface PerformanceMetrics {
  bestPaceSegment: {
    startKm: number;
    endKm: number;
    pace: number;
    duration: number;
  };
  worstPaceSegment: {
    startKm: number;
    endKm: number;
    pace: number;
    duration: number;
  };
  paceVariability: number;
  cadenceConsistency: number;
  effortDistribution: string;
}

export interface PaceDataPoint {
  time: number; // seconds from start
  distance: number; // meters from start
  pace: number; // seconds per km
  elevation: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export class PaceAnalysisService {
  /**
   * Process GPS data and return comprehensive pace analysis
   */
  static processGPSDataForPacing(gpsPoints: GPSPoint[]): PaceAnalysis {
    if (gpsPoints.length < 2) {
      return this.getEmptyAnalysis();
    }

    const filteredPoints = this.filterOutliers(gpsPoints);
    const segments = this.createKilometerSegments(filteredPoints);
    const splits = segments.map((segment, index) =>
      this.calculateKilometerSplit(segment, index + 1)
    );

    const averagePace = this.calculateAveragePace(splits);
    const paceZones = this.calculatePaceZones(averagePace, splits);
    const performanceMetrics = this.calculatePerformanceMetrics(splits);

    return {
      splits,
      fastestSplit: this.getFastestSplit(splits),
      slowestSplit: this.getSlowestSplit(splits),
      averagePace,
      paceConsistency: this.calculatePaceConsistency(splits),
      positiveNegativeSplit: this.analyzePositiveNegativeSplit(splits),
      paceZones,
      performanceMetrics
    };
  }

  /**
   * Create data points for pace chart visualization
   */
  static createPaceDataPoints(
    gpsPoints: GPSPoint[],
    smoothingWindow: number = 5
  ): PaceDataPoint[] {
    if (gpsPoints.length < 2) return [];

    const dataPoints: PaceDataPoint[] = [];
    let totalDistance = 0;
    const startTime = gpsPoints[0].timestamp.getTime();

    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];

      const segmentDistance = GeoUtils.calculateDistance(prev, curr, { precision: -1 });
      const segmentTime = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;

      if (segmentTime > 0 && segmentDistance > 0) {
        totalDistance += segmentDistance;
        const pace = segmentTime / (segmentDistance / 1000); // seconds per km

        dataPoints.push({
          time: (curr.timestamp.getTime() - startTime) / 1000,
          distance: totalDistance,
          pace,
          elevation: curr.altitude || 0,
          latitude: curr.latitude,
          longitude: curr.longitude,
          accuracy: curr.accuracy
        });
      }
    }

    return this.applySmoothingToPaceData(dataPoints, smoothingWindow);
  }

  /**
   * Calculate kilometer splits from GPS segments
   */
  private static createKilometerSegments(gpsPoints: GPSPoint[]): GPSPoint[][] {
    const segments: GPSPoint[][] = [];
    let currentSegment: GPSPoint[] = [gpsPoints[0]];
    let distanceAccumulator = 0;

    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];
      const distance = GeoUtils.calculateDistance(prev, curr, { precision: -1 });

      distanceAccumulator += distance;
      currentSegment.push(curr);

      // Complete a kilometer segment
      if (distanceAccumulator >= 1000) {
        segments.push([...currentSegment]);
        currentSegment = [curr]; // Start new segment with current point
        distanceAccumulator = 0;
      }
    }

    // Add final partial segment if it has meaningful distance
    if (currentSegment.length > 1 && distanceAccumulator > 100) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Calculate detailed split information for a kilometer segment
   */
  private static calculateKilometerSplit(
    segment: GPSPoint[],
    kilometerId: number
  ): KilometerSplit {
    if (segment.length < 2) {
      throw new Error('Segment must have at least 2 points');
    }

    const startPoint = segment[0];
    const endPoint = segment[segment.length - 1];

    const totalDistance = this.calculateSegmentDistance(segment);
    const totalTime = (endPoint.timestamp.getTime() - startPoint.timestamp.getTime()) / 1000;
    const pace = totalTime / (totalDistance / 1000);

    // Calculate elevation changes
    const { gain, loss } = this.calculateElevationChanges(segment);

    return {
      kilometer: kilometerId,
      pace,
      time: totalTime,
      cumulativeTime: 0, // Will be calculated later
      distance: totalDistance,
      startPoint,
      endPoint,
      elevationGain: gain,
      elevationLoss: loss
    };
  }

  /**
   * Calculate total distance for a GPS segment
   */
  private static calculateSegmentDistance(segment: GPSPoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < segment.length; i++) {
      totalDistance += GeoUtils.calculateDistance(
        segment[i - 1],
        segment[i],
        { precision: -1 }
      );
    }
    return totalDistance;
  }

  /**
   * Calculate elevation gain and loss for a segment
   */
  private static calculateElevationChanges(segment: GPSPoint[]): { gain: number; loss: number } {
    let gain = 0;
    let loss = 0;

    for (let i = 1; i < segment.length; i++) {
      const prevAlt = segment[i - 1].altitude || 0;
      const currAlt = segment[i].altitude || 0;
      const diff = currAlt - prevAlt;

      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }

    return { gain, loss };
  }

  /**
   * Define pace zones based on average pace
   */
  private static calculatePaceZones(averagePace: number, splits: KilometerSplit[]): PaceZoneAnalysis {
    const zones: PaceZone[] = [
      {
        name: 'Easy',
        minPace: averagePace + 60, // 1 minute slower than average
        maxPace: Infinity,
        color: '#4CAF50',
        description: 'Conversational pace, recovery runs'
      },
      {
        name: 'Moderate',
        minPace: averagePace - 30, // 30s faster than average
        maxPace: averagePace + 60,
        color: '#FFC107',
        description: 'Comfortable pace, base building'
      },
      {
        name: 'Hard',
        minPace: averagePace - 90, // 1.5 minutes faster than average
        maxPace: averagePace - 30,
        color: '#FF9800',
        description: 'Tempo pace, threshold training'
      },
      {
        name: 'Maximum',
        minPace: 0,
        maxPace: averagePace - 90,
        color: '#F44336',
        description: 'Race pace, high intensity'
      }
    ];

    const timeInZones: { [zoneName: string]: number } = {};
    const percentageInZones: { [zoneName: string]: number } = {};

    // Initialize counters
    zones.forEach(zone => {
      timeInZones[zone.name] = 0;
      percentageInZones[zone.name] = 0;
    });

    // Calculate time in each zone
    const totalTime = splits.reduce((sum, split) => sum + split.time, 0);

    splits.forEach(split => {
      const zone = zones.find(z => split.pace >= z.minPace && split.pace < z.maxPace);
      if (zone) {
        timeInZones[zone.name] += split.time;
      }
    });

    // Calculate percentages
    zones.forEach(zone => {
      percentageInZones[zone.name] = totalTime > 0
        ? (timeInZones[zone.name] / totalTime) * 100
        : 0;
    });

    return { zones, timeInZones, percentageInZones };
  }

  /**
   * Calculate performance metrics
   */
  private static calculatePerformanceMetrics(splits: KilometerSplit[]): PerformanceMetrics {
    if (splits.length === 0) {
      return {
        bestPaceSegment: { startKm: 0, endKm: 0, pace: 0, duration: 0 },
        worstPaceSegment: { startKm: 0, endKm: 0, pace: 0, duration: 0 },
        paceVariability: 0,
        cadenceConsistency: 0,
        effortDistribution: 'even'
      };
    }

    const fastestSplit = splits.reduce((fastest, split) =>
      split.pace < fastest.pace ? split : fastest
    );

    const slowestSplit = splits.reduce((slowest, split) =>
      split.pace > slowest.pace ? split : slowest
    );

    const paces = splits.map(s => s.pace);
    const averagePace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
    const paceVariability = this.calculateStandardDeviation(paces);

    return {
      bestPaceSegment: {
        startKm: fastestSplit.kilometer - 1,
        endKm: fastestSplit.kilometer,
        pace: fastestSplit.pace,
        duration: fastestSplit.time
      },
      worstPaceSegment: {
        startKm: slowestSplit.kilometer - 1,
        endKm: slowestSplit.kilometer,
        pace: slowestSplit.pace,
        duration: slowestSplit.time
      },
      paceVariability,
      cadenceConsistency: 0, // Would need cadence data
      effortDistribution: this.analyzeEffortDistribution(splits, averagePace)
    };
  }

  /**
   * Apply smoothing to pace data to reduce GPS noise
   */
  private static applySmoothingToPaceData(
    dataPoints: PaceDataPoint[],
    windowSize: number
  ): PaceDataPoint[] {
    if (dataPoints.length <= windowSize) return dataPoints;

    const smoothed = [...dataPoints];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = halfWindow; i < dataPoints.length - halfWindow; i++) {
      let paceSum = 0;
      let count = 0;

      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        if (j >= 0 && j < dataPoints.length) {
          paceSum += dataPoints[j].pace;
          count++;
        }
      }

      smoothed[i] = {
        ...dataPoints[i],
        pace: paceSum / count
      };
    }

    return smoothed;
  }

  /**
   * Filter out unrealistic pace outliers
   */
  private static filterOutliers(gpsPoints: GPSPoint[]): GPSPoint[] {
    if (gpsPoints.length < 3) return gpsPoints;

    const filtered = [gpsPoints[0]];
    const maxReasonableSpeed = 25; // km/h

    for (let i = 1; i < gpsPoints.length - 1; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];
      const next = gpsPoints[i + 1];

      const distance1 = GeoUtils.calculateDistance(prev, curr, { precision: -1 });
      const time1 = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      const speed1 = time1 > 0 ? (distance1 / 1000) / (time1 / 3600) : 0;

      const distance2 = GeoUtils.calculateDistance(curr, next, { precision: -1 });
      const time2 = (next.timestamp.getTime() - curr.timestamp.getTime()) / 1000;
      const speed2 = time2 > 0 ? (distance2 / 1000) / (time2 / 3600) : 0;

      // Keep point if speeds are reasonable
      if (speed1 <= maxReasonableSpeed && speed2 <= maxReasonableSpeed) {
        filtered.push(curr);
      }
    }

    filtered.push(gpsPoints[gpsPoints.length - 1]);
    return filtered;
  }

  // Helper methods
  private static getFastestSplit(splits: KilometerSplit[]): KilometerSplit | null {
    return splits.length > 0 ? splits.reduce((fastest, split) =>
      split.pace < fastest.pace ? split : fastest
    ) : null;
  }

  private static getSlowestSplit(splits: KilometerSplit[]): KilometerSplit | null {
    return splits.length > 0 ? splits.reduce((slowest, split) =>
      split.pace > slowest.pace ? split : slowest
    ) : null;
  }

  private static calculateAveragePace(splits: KilometerSplit[]): number {
    if (splits.length === 0) return 0;
    return splits.reduce((sum, split) => sum + split.pace, 0) / splits.length;
  }

  private static calculatePaceConsistency(splits: KilometerSplit[]): number {
    const paces = splits.map(s => s.pace);
    return this.calculateStandardDeviation(paces);
  }

  private static calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  private static analyzePositiveNegativeSplit(splits: KilometerSplit[]): 'positive' | 'negative' | 'even' {
    if (splits.length < 2) return 'even';

    const firstHalf = splits.slice(0, Math.floor(splits.length / 2));
    const secondHalf = splits.slice(Math.floor(splits.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.pace, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.pace, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;

    if (difference > 15) return 'negative'; // Second half significantly slower
    if (difference < -15) return 'positive'; // Second half significantly faster
    return 'even';
  }

  private static analyzeEffortDistribution(splits: KilometerSplit[], averagePace: number): string {
    const fastCount = splits.filter(s => s.pace < averagePace - 30).length;
    const slowCount = splits.filter(s => s.pace > averagePace + 30).length;

    if (fastCount > slowCount * 2) return 'front-loaded';
    if (slowCount > fastCount * 2) return 'back-loaded';
    return 'even';
  }

  private static getEmptyAnalysis(): PaceAnalysis {
    return {
      splits: [],
      fastestSplit: null,
      slowestSplit: null,
      averagePace: 0,
      paceConsistency: 0,
      positiveNegativeSplit: 'even',
      paceZones: {
        zones: [],
        timeInZones: {},
        percentageInZones: {}
      },
      performanceMetrics: {
        bestPaceSegment: { startKm: 0, endKm: 0, pace: 0, duration: 0 },
        worstPaceSegment: { startKm: 0, endKm: 0, pace: 0, duration: 0 },
        paceVariability: 0,
        cadenceConsistency: 0,
        effortDistribution: 'even'
      }
    };
  }
}