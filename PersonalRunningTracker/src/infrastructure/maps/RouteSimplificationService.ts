import { GPSPoint } from '@/domain/entities';

export interface RouteSimplificationConfig {
  maxPoints?: number;
  tolerance?: number;
  preserveEndpoints?: boolean;
}

export class RouteSimplificationService {
  /**
   * Simplifies a GPS route using the Douglas-Peucker algorithm
   * @param points Original GPS points
   * @param config Simplification configuration
   * @returns Simplified GPS points
   */
  static simplifyRoute(
    points: GPSPoint[],
    config: RouteSimplificationConfig = {}
  ): GPSPoint[] {
    const {
      maxPoints = 1000,
      tolerance = 0.0001,
      preserveEndpoints = true
    } = config;

    if (points.length <= 2) {
      return points;
    }

    // If already under maxPoints, apply light filtering only
    if (points.length <= maxPoints) {
      return this.lightFilter(points, tolerance / 2);
    }

    // Apply Douglas-Peucker algorithm
    let simplified = this.douglasPeucker(points, tolerance);

    // If still too many points, increase tolerance and try again
    let currentTolerance = tolerance;
    while (simplified.length > maxPoints && currentTolerance < 0.01) {
      currentTolerance *= 2;
      simplified = this.douglasPeucker(points, currentTolerance);
    }

    // If still too many points, use distance-based sampling as fallback
    if (simplified.length > maxPoints) {
      simplified = this.distanceBasedSampling(points, maxPoints, preserveEndpoints);
    }

    return simplified;
  }

  /**
   * Douglas-Peucker line simplification algorithm
   */
  private static douglasPeucker(points: GPSPoint[], tolerance: number): GPSPoint[] {
    if (points.length <= 2) {
      return points;
    }

    // Find the point with maximum distance from the line between first and last points
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const firstSegment = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const secondSegment = this.douglasPeucker(points.slice(maxIndex), tolerance);

      // Merge results (remove duplicate point at connection)
      return [...firstSegment.slice(0, -1), ...secondSegment];
    }

    // Return only endpoints if within tolerance
    return [start, end];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private static perpendicularDistance(point: GPSPoint, lineStart: GPSPoint, lineEnd: GPSPoint): number {
    const lat1 = lineStart.latitude;
    const lon1 = lineStart.longitude;
    const lat2 = lineEnd.latitude;
    const lon2 = lineEnd.longitude;
    const lat3 = point.latitude;
    const lon3 = point.longitude;

    // Convert to radians
    const lat1Rad = lat1 * Math.PI / 180;
    const lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lon2Rad = lon2 * Math.PI / 180;
    const lat3Rad = lat3 * Math.PI / 180;
    const lon3Rad = lon3 * Math.PI / 180;

    // Earth radius in degrees (approximately)
    const R = 6371000; // meters

    // For small distances, use approximate Cartesian distance
    const x1 = R * Math.cos(lat1Rad) * lon1Rad;
    const y1 = R * lat1Rad;
    const x2 = R * Math.cos(lat2Rad) * lon2Rad;
    const y2 = R * lat2Rad;
    const x3 = R * Math.cos(lat3Rad) * lon3Rad;
    const y3 = R * lat3Rad;

    // Calculate perpendicular distance using cross product
    const A = x1 - x2;
    const B = y1 - y2;
    const C = x2 * y1 - x1 * y2;

    const distance = Math.abs(A * y3 - B * x3 + (x3 * y2 - x2 * y3)) / Math.sqrt(A * A + B * B);

    return distance;
  }

  /**
   * Light filtering for routes that don't need heavy simplification
   */
  private static lightFilter(points: GPSPoint[], minDistance: number): GPSPoint[] {
    if (points.length <= 2) return points;

    const filtered = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = filtered[filtered.length - 1];
      const current = points[i];

      const distance = this.calculateDistance(prev, current);
      if (distance >= minDistance) {
        filtered.push(current);
      }
    }

    // Always include the last point
    filtered.push(points[points.length - 1]);

    return filtered;
  }

  /**
   * Distance-based sampling fallback for very dense routes
   */
  private static distanceBasedSampling(
    points: GPSPoint[],
    maxPoints: number,
    preserveEndpoints: boolean
  ): GPSPoint[] {
    if (points.length <= maxPoints) return points;

    const step = Math.floor(points.length / (maxPoints - (preserveEndpoints ? 2 : 0)));
    const sampled: GPSPoint[] = [];

    if (preserveEndpoints) {
      sampled.push(points[0]);
    }

    for (let i = preserveEndpoints ? step : 0; i < points.length; i += step) {
      if (!preserveEndpoints || (i !== 0 && i !== points.length - 1)) {
        sampled.push(points[i]);
      }
    }

    if (preserveEndpoints && points.length > 1) {
      sampled.push(points[points.length - 1]);
    }

    return sampled;
  }

  /**
   * Calculate distance between two GPS points in meters
   */
  private static calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get optimal simplification config based on route characteristics
   */
  static getOptimalConfig(points: GPSPoint[]): RouteSimplificationConfig {
    const pointCount = points.length;

    if (pointCount <= 100) {
      return { maxPoints: pointCount, tolerance: 0.00005 };
    } else if (pointCount <= 500) {
      return { maxPoints: 200, tolerance: 0.0001 };
    } else if (pointCount <= 1000) {
      return { maxPoints: 300, tolerance: 0.0002 };
    } else if (pointCount <= 2000) {
      return { maxPoints: 400, tolerance: 0.0003 };
    } else {
      return { maxPoints: 500, tolerance: 0.0005 };
    }
  }
}