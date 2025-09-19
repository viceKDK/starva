import { Run, RunId, GPSPoint } from '@/domain/entities';

export interface CreateRunOptions {
  startTime: Date;
  endTime: Date;
  route: GPSPoint[];
  name?: string;
  notes?: string;
}

export interface CreateRunFromTrackingOptions {
  route: GPSPoint[];
  name?: string;
  notes?: string;
}

export class RunFactory {
  static create(options: CreateRunOptions): Run {
    const { startTime, endTime, route, name, notes } = options;

    // Calculate basic metrics
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const distance = this.calculateTotalDistance(route);
    const averagePace = distance > 0 ? duration / (distance / 1000) : 0;

    // Generate default name if not provided
    const runName = name || this.generateDefaultName(startTime);

    return new Run(
      RunId.generate(),
      runName,
      startTime,
      endTime,
      distance,
      duration,
      averagePace,
      route,
      notes
    );
  }

  static createFromTracking(options: CreateRunFromTrackingOptions): Run {
    const { route, name, notes } = options;

    if (route.length < 2) {
      throw new Error('Route must contain at least 2 GPS points');
    }

    // Extract start and end times from GPS points
    const sortedRoute = [...route].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const startTime = sortedRoute[0].timestamp;
    const endTime = sortedRoute[sortedRoute.length - 1].timestamp;

    return this.create({
      startTime,
      endTime,
      route: sortedRoute,
      name,
      notes
    });
  }

  static createMockRun(overrides?: Partial<CreateRunOptions>): Run {
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    const endTime = now;

    const defaultRoute = this.generateMockRoute(startTime, endTime);

    const options: CreateRunOptions = {
      startTime,
      endTime,
      route: defaultRoute,
      name: 'Mock Run',
      notes: 'Generated for testing',
      ...overrides
    };

    return this.create(options);
  }

  static createQuickRun(
    distanceKm: number,
    durationMinutes: number,
    name?: string
  ): Run {
    const now = new Date();
    const startTime = new Date(now.getTime() - durationMinutes * 60 * 1000);
    const endTime = now;

    // Generate a simple route for the given distance
    const route = this.generateRouteForDistance(startTime, endTime, distanceKm * 1000);

    return this.create({
      startTime,
      endTime,
      route,
      name: name || `${distanceKm}K Run`
    });
  }

  private static calculateTotalDistance(route: GPSPoint[]): number {
    if (route.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(route[i - 1], route[i]);
    }
    return totalDistance;
  }

  private static calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
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

  private static generateDefaultName(startTime: Date): string {
    const timeString = startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const dateString = startTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return `${timeString} Run - ${dateString}`;
  }

  private static generateMockRoute(startTime: Date, endTime: Date): GPSPoint[] {
    const route: GPSPoint[] = [];
    const duration = endTime.getTime() - startTime.getTime();
    const pointCount = Math.max(10, Math.floor(duration / 5000)); // Point every 5 seconds

    // Mock coordinates (Central Park area)
    const baseLat = 40.7829;
    const baseLng = -73.9654;
    const radius = 0.005; // ~500m radius

    for (let i = 0; i < pointCount; i++) {
      const progress = i / (pointCount - 1);
      const timestamp = new Date(startTime.getTime() + progress * duration);

      // Generate a circular route
      const angle = progress * 2 * Math.PI;
      const lat = baseLat + Math.cos(angle) * radius;
      const lng = baseLng + Math.sin(angle) * radius;

      route.push({
        latitude: lat,
        longitude: lng,
        timestamp,
        accuracy: 5 + Math.random() * 5, // 5-10m accuracy
        altitude: 100 + Math.random() * 10 // ~100m elevation
      });
    }

    return route;
  }

  private static generateRouteForDistance(
    startTime: Date,
    endTime: Date,
    targetDistanceMeters: number
  ): GPSPoint[] {
    const route: GPSPoint[] = [];
    const duration = endTime.getTime() - startTime.getTime();
    const pointCount = Math.max(10, Math.floor(duration / 1000)); // Point every second

    // Calculate step size to reach target distance
    const averageStepDistance = targetDistanceMeters / (pointCount - 1);
    const stepDistanceInDegrees = averageStepDistance / 111000; // Rough conversion

    // Starting point
    let currentLat = 40.7829;
    let currentLng = -73.9654;

    for (let i = 0; i < pointCount; i++) {
      const progress = i / (pointCount - 1);
      const timestamp = new Date(startTime.getTime() + progress * duration);

      route.push({
        latitude: currentLat,
        longitude: currentLng,
        timestamp,
        accuracy: 5 + Math.random() * 3,
        altitude: 100 + Math.random() * 10
      });

      // Move to next point (roughly in a straight line with some variation)
      if (i < pointCount - 1) {
        currentLat += stepDistanceInDegrees * (0.8 + Math.random() * 0.4);
        currentLng += stepDistanceInDegrees * (0.8 + Math.random() * 0.4) * 0.5;
      }
    }

    return route;
  }
}