import { GPSPoint } from '@/domain/entities';

export interface GPSValidationResult {
  isValid: boolean;
  filteredPoints: GPSPoint[];
  removedPoints: number;
  averageAccuracy: number;
  qualityScore: number; // 0-100
}

export interface GPSValidationConfig {
  maxSpeed: number; // km/h
  maxAccuracy: number; // meters
  minPointsRequired: number;
  outlierThreshold: number; // meters
}

export class GPSDataValidationService {
  private readonly config: GPSValidationConfig;

  constructor(config?: Partial<GPSValidationConfig>) {
    this.config = {
      maxSpeed: 50, // 50 km/h maximum reasonable running speed
      maxAccuracy: 50, // 50 meters maximum GPS accuracy
      minPointsRequired: 5, // Minimum points for a valid route
      outlierThreshold: 100, // Remove points more than 100m from expected path
      ...config
    };
  }

  validateAndFilterGPSData(points: GPSPoint[]): GPSValidationResult {
    if (points.length < this.config.minPointsRequired) {
      return {
        isValid: false,
        filteredPoints: [],
        removedPoints: points.length,
        averageAccuracy: 0,
        qualityScore: 0
      };
    }

    let filteredPoints = [...points];
    let removedCount = 0;

    // Sort points by timestamp to ensure proper order
    filteredPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Remove points with poor accuracy
    const accuracyFiltered = this.filterByAccuracy(filteredPoints);
    removedCount += filteredPoints.length - accuracyFiltered.length;
    filteredPoints = accuracyFiltered;

    // Remove points with impossible speeds
    const speedFiltered = this.filterBySpeed(filteredPoints);
    removedCount += filteredPoints.length - speedFiltered.length;
    filteredPoints = speedFiltered;

    // Remove outlier points that are too far from the expected path
    const outlierFiltered = this.filterOutliers(filteredPoints);
    removedCount += filteredPoints.length - outlierFiltered.length;
    filteredPoints = outlierFiltered;

    const averageAccuracy = this.calculateAverageAccuracy(filteredPoints);
    const qualityScore = this.calculateQualityScore(filteredPoints, points.length, averageAccuracy);

    return {
      isValid: filteredPoints.length >= this.config.minPointsRequired,
      filteredPoints,
      removedPoints: removedCount,
      averageAccuracy,
      qualityScore
    };
  }

  private filterByAccuracy(points: GPSPoint[]): GPSPoint[] {
    return points.filter(point =>
      point.accuracy == null || point.accuracy <= this.config.maxAccuracy
    );
  }

  private filterBySpeed(points: GPSPoint[]): GPSPoint[] {
    if (points.length < 2) return points;

    const result: GPSPoint[] = [points[0]]; // Always keep first point

    for (let i = 1; i < points.length; i++) {
      const currentPoint = points[i];
      const previousPoint = points[i - 1];

      const distance = this.calculateDistance(previousPoint, currentPoint);
      const timeDiff = (currentPoint.timestamp.getTime() - previousPoint.timestamp.getTime()) / 1000; // seconds

      if (timeDiff > 0) {
        const speedMPS = distance / timeDiff; // meters per second
        const speedKMH = speedMPS * 3.6; // km/h

        if (speedKMH <= this.config.maxSpeed) {
          result.push(currentPoint);
        }
      } else {
        // If timestamps are the same, keep the more accurate point
        if (currentPoint.accuracy != null && previousPoint.accuracy != null) {
          if (currentPoint.accuracy <= previousPoint.accuracy) {
            result[result.length - 1] = currentPoint; // Replace last point
          }
        } else {
          result.push(currentPoint); // Keep both if accuracy is unknown
        }
      }
    }

    return result;
  }

  private filterOutliers(points: GPSPoint[]): GPSPoint[] {
    if (points.length < 3) return points;

    const result: GPSPoint[] = [points[0]]; // Always keep first point

    for (let i = 1; i < points.length - 1; i++) {
      const currentPoint = points[i];
      const previousPoint = result[result.length - 1];
      const nextPoint = points[i + 1];

      // Calculate expected position based on linear interpolation
      const expectedLat = (previousPoint.latitude + nextPoint.latitude) / 2;
      const expectedLng = (previousPoint.longitude + nextPoint.longitude) / 2;

      const expectedPoint: GPSPoint = {
        latitude: expectedLat,
        longitude: expectedLng,
        timestamp: currentPoint.timestamp,
        accuracy: currentPoint.accuracy,
        altitude: currentPoint.altitude
      };

      const distanceFromExpected = this.calculateDistance(currentPoint, expectedPoint);

      // Keep point if it's within reasonable distance from expected path
      if (distanceFromExpected <= this.config.outlierThreshold) {
        result.push(currentPoint);
      }
    }

    // Always keep last point
    if (points.length > 0) {
      result.push(points[points.length - 1]);
    }

    return result;
  }

  private calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateAverageAccuracy(points: GPSPoint[]): number {
    const accuracyPoints = points.filter(p => p.accuracy != null);
    if (accuracyPoints.length === 0) return 0;

    const totalAccuracy = accuracyPoints.reduce((sum, p) => sum + (p.accuracy || 0), 0);
    return totalAccuracy / accuracyPoints.length;
  }

  private calculateQualityScore(
    filteredPoints: GPSPoint[],
    originalCount: number,
    averageAccuracy: number
  ): number {
    if (originalCount === 0) return 0;

    // Base score from data retention (40 points max)
    const retentionRatio = filteredPoints.length / originalCount;
    const retentionScore = Math.min(retentionRatio * 40, 40);

    // Accuracy score (30 points max)
    const accuracyScore = averageAccuracy > 0
      ? Math.max(0, 30 - (averageAccuracy / this.config.maxAccuracy) * 30)
      : 15; // Default score if no accuracy data

    // Point density score (30 points max)
    const densityScore = Math.min((filteredPoints.length / this.config.minPointsRequired) * 30, 30);

    return Math.round(retentionScore + accuracyScore + densityScore);
  }

  getQualityAssessment(qualityScore: number): {
    level: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    description: string;
    color: string;
  } {
    if (qualityScore >= 80) {
      return {
        level: 'Excellent',
        description: 'High-quality GPS data with excellent accuracy',
        color: '#4CAF50'
      };
    } else if (qualityScore >= 60) {
      return {
        level: 'Good',
        description: 'Good GPS data quality suitable for accurate tracking',
        color: '#8BC34A'
      };
    } else if (qualityScore >= 40) {
      return {
        level: 'Fair',
        description: 'Acceptable GPS data with some accuracy limitations',
        color: '#FF9800'
      };
    } else {
      return {
        level: 'Poor',
        description: 'Poor GPS data quality may affect accuracy',
        color: '#F44336'
      };
    }
  }
}