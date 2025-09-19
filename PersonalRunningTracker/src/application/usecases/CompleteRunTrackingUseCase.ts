import { IGPSService } from '@/domain/repositories';
import { Run, GPSPoint } from '@/domain/entities';
import { GPSError } from '@/domain/types';
import { Result } from '@/shared/types';

export interface CompleteTrackingResult {
  run: Run;
  trackingPoints: GPSPoint[];
}

export class CompleteRunTrackingUseCase {
  constructor(private gpsService: IGPSService) {}

  async execute(): Promise<Result<CompleteTrackingResult, GPSError>> {
    // Stop GPS tracking and get final route points
    const stopResult = await this.gpsService.stopTracking();
    if (!stopResult.success) {
      return { success: false, error: stopResult.error };
    }

    const trackingPoints = stopResult.data || [];

    if (trackingPoints.length === 0) {
      return { success: false, error: 'INVALID_LOCATION' as GPSError };
    }

    // Calculate run metrics
    const startTime = trackingPoints[0]!.timestamp;
    const endTime = trackingPoints[trackingPoints.length - 1]!.timestamp;
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Calculate distance (simple haversine distance)
    const distance = this.calculateTotalDistance(trackingPoints);

    // Calculate average pace (seconds per km)
    const averagePace = distance > 0 ? (duration / (distance / 1000)) : 0;

    // Create run entity (without saving)
    const run: Run = {
      id: `run_${Date.now()}`,
      startTime,
      endTime,
      duration,
      distance,
      averagePace,
      route: trackingPoints,
      name: `Run ${new Date().toLocaleDateString()}`, // Default name - will be customized
      notes: '',
      createdAt: new Date()
    };

    return {
      success: true,
      data: {
        run,
        trackingPoints
      }
    };
  }

  private calculateTotalDistance(points: GPSPoint[]): number {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.haversineDistance(points[i - 1]!, points[i]!);
    }
    return totalDistance;
  }

  private haversineDistance(point1: GPSPoint, point2: GPSPoint): number {
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
}