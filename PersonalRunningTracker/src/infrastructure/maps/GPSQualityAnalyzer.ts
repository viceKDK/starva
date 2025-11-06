import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils/GeoUtils';

export interface GPSQualityMetrics {
  averageAccuracy: number;
  poorAccuracyPercentage: number;
  signalLossGaps: SignalLossGap[];
  totalPoints: number;
  filteredPoints: number;
  outlierCount: number;
  qualityScore: number; // 0-100
}

export interface SignalLossGap {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  estimatedDistance: number;
  coordinates: { latitude: number; longitude: number }[];
}

export interface QualityFilterConfig {
  maxAccuracy?: number; // meters
  maxSpeed?: number; // km/h
  minMovement?: number; // meters
}

export class GPSQualityAnalyzer {
  /**
   * Analyze the quality of GPS data in a route
   */
  static analyzeRouteQuality(points: GPSPoint[]): GPSQualityMetrics {
    if (points.length === 0) {
      return {
        averageAccuracy: 0,
        poorAccuracyPercentage: 0,
        signalLossGaps: [],
        totalPoints: 0,
        filteredPoints: 0,
        outlierCount: 0,
        qualityScore: 0
      };
    }

    const validAccuracyPoints = points.filter(p => p.accuracy !== undefined && p.accuracy > 0);
    const averageAccuracy = validAccuracyPoints.length > 0
      ? validAccuracyPoints.reduce((sum, p) => sum + p.accuracy!, 0) / validAccuracyPoints.length
      : 0;

    const poorAccuracyPoints = validAccuracyPoints.filter(p => p.accuracy! > 50);
    const poorAccuracyPercentage = validAccuracyPoints.length > 0
      ? (poorAccuracyPoints.length / validAccuracyPoints.length) * 100
      : 0;

    const signalLossGaps = this.detectSignalLossGaps(points);
    const outlierCount = this.countOutliers(points);

    // Calculate quality score (0-100)
    let qualityScore = 100;
    qualityScore -= Math.min(30, poorAccuracyPercentage); // Poor accuracy penalty
    qualityScore -= Math.min(20, signalLossGaps.length * 5); // Signal loss penalty
    qualityScore -= Math.min(15, outlierCount * 2); // Outlier penalty
    qualityScore -= Math.min(10, Math.max(0, averageAccuracy - 10)); // Average accuracy penalty

    return {
      averageAccuracy: Math.round(averageAccuracy * 10) / 10,
      poorAccuracyPercentage: Math.round(poorAccuracyPercentage * 10) / 10,
      signalLossGaps,
      totalPoints: points.length,
      filteredPoints: points.length - outlierCount,
      outlierCount,
      qualityScore: Math.max(0, Math.round(qualityScore))
    };
  }

  /**
   * Filter GPS points based on quality criteria
   */
  static filterByQuality(points: GPSPoint[], config: QualityFilterConfig = {}): GPSPoint[] {
    const {
      maxAccuracy = 100,
      maxSpeed = 50,
      minMovement = 0.5
    } = config;

    if (points.length <= 1) return points;

    const filtered = [points[0]]; // Always keep first point

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const previous = points[i - 1];

      // Check accuracy
      if (current.accuracy !== undefined && current.accuracy > maxAccuracy) {
        continue;
      }

      // Check for unrealistic speed
      const distance = GeoUtils.calculateDistance(previous, current, { precision: -1 });
      const timeDiff = (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000;

      if (timeDiff > 0) {
        const speedKmh = (distance / 1000) / (timeDiff / 3600);
        if (speedKmh > maxSpeed) {
          continue;
        }
      }

      // Check minimum movement
      if (distance < minMovement) {
        continue;
      }

      filtered.push(current);
    }

    return filtered;
  }

  /**
   * Detect periods where GPS signal was lost
   */
  private static detectSignalLossGaps(points: GPSPoint[]): SignalLossGap[] {
    const gaps: SignalLossGap[] = [];
    const MAX_NORMAL_GAP = 10; // seconds

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;

      if (timeDiff > MAX_NORMAL_GAP) {
        const estimatedDistance = GeoUtils.calculateDistance(prev, curr, { precision: -1 });

        gaps.push({
          startTime: prev.timestamp,
          endTime: curr.timestamp,
          durationSeconds: timeDiff,
          estimatedDistance,
          coordinates: [
            { latitude: prev.latitude, longitude: prev.longitude },
            { latitude: curr.latitude, longitude: curr.longitude }
          ]
        });
      }
    }

    return gaps;
  }

  /**
   * Count GPS outliers (points with impossible speeds or positions)
   */
  private static countOutliers(points: GPSPoint[]): number {
    if (points.length <= 2) return 0;

    let outliers = 0;
    const MAX_SPEED_KMH = 50;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Check speed to previous point
      const distance1 = GeoUtils.calculateDistance(prev, curr, { precision: -1 });
      const timeDiff1 = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;

      // Check speed to next point
      const distance2 = GeoUtils.calculateDistance(curr, next, { precision: -1 });
      const timeDiff2 = (next.timestamp.getTime() - curr.timestamp.getTime()) / 1000;

      if (timeDiff1 > 0 && timeDiff2 > 0) {
        const speed1 = (distance1 / 1000) / (timeDiff1 / 3600);
        const speed2 = (distance2 / 1000) / (timeDiff2 / 3600);

        if (speed1 > MAX_SPEED_KMH || speed2 > MAX_SPEED_KMH) {
          outliers++;
        }
      }
    }

    return outliers;
  }

  /**
   * Get quality assessment text
   */
  static getQualityAssessment(metrics: GPSQualityMetrics): string {
    if (metrics.qualityScore >= 90) return 'Excellent';
    if (metrics.qualityScore >= 80) return 'Good';
    if (metrics.qualityScore >= 70) return 'Fair';
    if (metrics.qualityScore >= 60) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get recommendations for improving GPS quality
   */
  static getQualityRecommendations(metrics: GPSQualityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.averageAccuracy > 15) {
      recommendations.push('Try running in areas with better sky visibility');
    }

    if (metrics.poorAccuracyPercentage > 20) {
      recommendations.push('Avoid running near tall buildings or under heavy tree cover');
    }

    if (metrics.signalLossGaps.length > 3) {
      recommendations.push('Check if GPS is enabled and location services are allowed');
    }

    if (metrics.outlierCount > metrics.totalPoints * 0.1) {
      recommendations.push('Keep your phone stable during runs for better tracking');
    }

    if (recommendations.length === 0) {
      recommendations.push('GPS quality is good! Keep up the good tracking.');
    }

    return recommendations;
  }
}