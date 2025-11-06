import { GPSPoint } from '@/domain/entities';

export interface DistanceCalculationOptions {
  unit?: 'meters' | 'kilometers' | 'miles';
  precision?: number;
}

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  centerLatitude: number;
  centerLongitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export class GeoUtils {
  private static readonly EARTH_RADIUS_METERS = 6371000;
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly EARTH_RADIUS_MILES = 3959;

  /**
   * Calculate distance between two GPS points using Haversine formula
   */
  static calculateDistance(
    point1: GPSPoint,
    point2: GPSPoint,
    options: DistanceCalculationOptions = {}
  ): number {
    const { unit = 'meters', precision = 2 } = options;

    const lat1Rad = this.toRadians(point1.latitude);
    const lat2Rad = this.toRadians(point2.latitude);
    const deltaLatRad = this.toRadians(point2.latitude - point1.latitude);
    const deltaLonRad = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    let radius: number;
    switch (unit) {
      case 'kilometers':
        radius = this.EARTH_RADIUS_KM;
        break;
      case 'miles':
        radius = this.EARTH_RADIUS_MILES;
        break;
      default:
        radius = this.EARTH_RADIUS_METERS;
    }

    const distance = radius * c;
    return precision >= 0 ? Number(distance.toFixed(precision)) : distance;
  }

  /**
   * Calculate total distance for a route (array of GPS points)
   */
  static calculateRouteDistance(
    route: GPSPoint[],
    options: DistanceCalculationOptions = {}
  ): number {
    if (route.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(route[i - 1]!, route[i]!, {
        ...options,
        precision: -1 // Don't round intermediate calculations
      });
    }

    const { precision = 2 } = options;
    return precision >= 0 ? Number(totalDistance.toFixed(precision)) : totalDistance;
  }

  /**
   * Calculate bearing (direction) between two GPS points
   */
  static calculateBearing(point1: GPSPoint, point2: GPSPoint): number {
    const lat1Rad = this.toRadians(point1.latitude);
    const lat2Rad = this.toRadians(point2.latitude);
    const deltaLonRad = this.toRadians(point2.longitude - point1.longitude);

    const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);

    const bearingRad = Math.atan2(y, x);
    return (this.toDegrees(bearingRad) + 360) % 360;
  }

  /**
   * Calculate speed between two GPS points
   */
  static calculateSpeed(
    point1: GPSPoint,
    point2: GPSPoint,
    options: { unit?: 'mps' | 'kmh' | 'mph' } = {}
  ): number {
    const { unit = 'mps' } = options;

    const distance = this.calculateDistance(point1, point2); // meters
    const timeDiff = (point2.timestamp.getTime() - point1.timestamp.getTime()) / 1000; // seconds

    if (timeDiff <= 0) return 0;

    const speedMPS = distance / timeDiff;

    switch (unit) {
      case 'kmh':
        return speedMPS * 3.6;
      case 'mph':
        return speedMPS * 2.237;
      default:
        return speedMPS;
    }
  }

  /**
   * Calculate bounding box for a set of GPS points
   */
  static calculateBoundingBox(
    points: GPSPoint[],
    padding: number = 0.1
  ): BoundingBox {
    if (points.length === 0) {
      throw new Error('Cannot calculate bounding box for empty points array');
    }

    const latitudes = points.map(p => p.latitude);
    const longitudes = points.map(p => p.longitude);

    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    const centerLatitude = (minLatitude + maxLatitude) / 2;
    const centerLongitude = (minLongitude + maxLongitude) / 2;

    const latitudeDelta = Math.max((maxLatitude - minLatitude) * (1 + padding), 0.01);
    const longitudeDelta = Math.max((maxLongitude - minLongitude) * (1 + padding), 0.01);

    return {
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
      centerLatitude,
      centerLongitude,
      latitudeDelta,
      longitudeDelta
    };
  }

  /**
   * Check if a GPS point is valid
   */
  static isValidGPSPoint(point: Partial<GPSPoint>): point is GPSPoint {
    return (
      typeof point.latitude === 'number' &&
      typeof point.longitude === 'number' &&
      point.latitude >= -90 &&
      point.latitude <= 90 &&
      point.longitude >= -180 &&
      point.longitude <= 180 &&
      point.timestamp instanceof Date &&
      !isNaN(point.timestamp.getTime())
    );
  }

  /**
   * Filter out invalid GPS points from an array
   */
  static filterValidPoints(points: Partial<GPSPoint>[]): GPSPoint[] {
    return points.filter(this.isValidGPSPoint);
  }

  /**
   * Smooth GPS route by removing outliers
   */
  static smoothRoute(
    route: GPSPoint[],
    maxSpeedKmh: number = 50,
    maxAccuracyMeters: number = 50
  ): GPSPoint[] {
    if (route.length < 3) return route;

    const smoothed: GPSPoint[] = [route[0]!]; // Always keep first point

    for (let i = 1; i < route.length - 1; i++) {
      const current = route[i]!;
      const previous = smoothed[smoothed.length - 1]!;

      // Check accuracy filter
      if (current.accuracy && current.accuracy > maxAccuracyMeters) {
        continue;
      }

      // Check speed filter
      const speed = this.calculateSpeed(previous, current, { unit: 'kmh' });
      if (speed > maxSpeedKmh) {
        continue;
      }

      smoothed.push(current);
    }

    // Always keep last point
    if (route.length > 1) {
      smoothed.push(route[route.length - 1]!);
    }

    return smoothed;
  }

  /**
   * Interpolate GPS points to fill gaps in route
   */
  static interpolateRoute(
    route: GPSPoint[],
    maxGapSeconds: number = 30
  ): GPSPoint[] {
    if (route.length < 2) return route;

    const interpolated: GPSPoint[] = [route[0]!];

    for (let i = 1; i < route.length; i++) {
      const previous = route[i - 1]!;
      const current = route[i]!;
      const timeDiff = (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000;

      if (timeDiff > maxGapSeconds) {
        // Add interpolated points
        const steps = Math.floor(timeDiff / maxGapSeconds);
        for (let step = 1; step < steps; step++) {
          const ratio = step / steps;
          const interpolatedPoint: GPSPoint = {
            latitude: previous.latitude + (current.latitude - previous.latitude) * ratio,
            longitude: previous.longitude + (current.longitude - previous.longitude) * ratio,
            timestamp: new Date(previous.timestamp.getTime() + timeDiff * ratio * 1000),
            accuracy: Math.max(previous.accuracy || 0, current.accuracy || 0),
            altitude: (previous.altitude != null && current.altitude != null)
              ? previous.altitude + (current.altitude - previous.altitude) * ratio
              : undefined
          };
          interpolated.push(interpolatedPoint);
        }
      }

      interpolated.push(current);
    }

    return interpolated;
  }

  /**
   * Calculate route efficiency (actual distance vs straight line distance)
   */
  static calculateRouteEfficiency(route: GPSPoint[]): number {
    if (route.length < 2) return 1;

    const actualDistance = this.calculateRouteDistance(route);
    const straightLineDistance = this.calculateDistance(route[0]!, route[route.length - 1]!);

    if (straightLineDistance === 0) return 1;
    return straightLineDistance / actualDistance;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}
