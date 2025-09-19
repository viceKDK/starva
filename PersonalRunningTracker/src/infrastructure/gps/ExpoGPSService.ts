// Expo GPS service implementation with comprehensive error handling
import * as Location from 'expo-location';
import { IGPSService } from '@/domain/repositories';
import { GPSPoint } from '@/domain/entities';
import { GPSError } from '@/domain/types';
import { Result, Ok, Err } from '@/shared/types';

export class ExpoGPSService implements IGPSService {
  private subscription: Location.LocationSubscription | null = null;
  private trackingPoints: GPSPoint[] = [];
  private isCurrentlyTracking = false;
  private isPaused = false;
  private lastValidLocation: GPSPoint | null = null;

  // Configuration constants
  private readonly GPS_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_ACCURACY_THRESHOLD = 100; // tolerate up to 100m to allow initial fix
  private readonly MIN_TIME_INTERVAL = 1000; // 1 second
  private readonly MIN_DISTANCE_INTERVAL = 5; // 5 meters
  private readonly MAX_SPEED_THRESHOLD = 50; // 50 km/h
  private readonly MIN_TIME_BETWEEN_POINTS = 800; // 0.8 seconds

  async startTracking(): Promise<Result<void, GPSError>> {
    try {
      // Check if already tracking
      if (this.isCurrentlyTracking) {
        return Ok(undefined);
      }

      // Request permissions
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return Err(permissionResult.error);
      }

      // Check if location services are enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        return Err('GPS_DISABLED');
      }

      // Clear previous tracking data
      this.trackingPoints = [];
      this.isPaused = false;
      this.lastValidLocation = null;

      // Start location tracking
      this.subscription = await Location.watchPositionAsync(
        {
          // Balanced improves time-to-first-fix in Expo Go; we can raise later
          accuracy: Location.Accuracy.Balanced,
          timeInterval: this.MIN_TIME_INTERVAL,
          distanceInterval: this.MIN_DISTANCE_INTERVAL,
        },
        (location) => {
          if (!this.isPaused) {
            this.handleLocationUpdate(location);
          }
        }
      );

      this.isCurrentlyTracking = true;
      return Ok(undefined);
    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      return Err('SERVICE_UNAVAILABLE');
    }
  }

  async stopTracking(): Promise<Result<GPSPoint[], GPSError>> {
    try {
      if (!this.isCurrentlyTracking) {
        return Ok([]);
      }

      // Stop location subscription
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }

      this.isCurrentlyTracking = false;
      this.isPaused = false;

      // Return copy of tracking points
      const points = [...this.trackingPoints];
      return Ok(points);
    } catch (error) {
      console.error('Error stopping GPS tracking:', error);
      return Err('SERVICE_UNAVAILABLE');
    }
  }

  async pauseTracking(): Promise<Result<void, GPSError>> {
    try {
      if (!this.isCurrentlyTracking) {
        return Err('SERVICE_UNAVAILABLE');
      }

      this.isPaused = true;
      return Ok(undefined);
    } catch (error) {
      console.error('Error pausing GPS tracking:', error);
      return Err('SERVICE_UNAVAILABLE');
    }
  }

  async resumeTracking(): Promise<Result<void, GPSError>> {
    try {
      if (!this.isCurrentlyTracking) {
        return Err('SERVICE_UNAVAILABLE');
      }

      this.isPaused = false;
      return Ok(undefined);
    } catch (error) {
      console.error('Error resuming GPS tracking:', error);
      return Err('SERVICE_UNAVAILABLE');
    }
  }

  async getCurrentLocation(): Promise<Result<GPSPoint, GPSError>> {
    try {
      // Request permissions first
      const permissionResult = await this.requestPermissions();
      if (!permissionResult.success) {
        return Err(permissionResult.error);
      }

      // Check if location services are enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        return Err('GPS_DISABLED');
      }

      // Get current location with timeout
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: this.GPS_TIMEOUT,
      });

      const gpsPoint = this.locationToGPSPoint(location);
      const validationResult = this.validateGPSPoint(gpsPoint);

      if (!validationResult.success) {
        return Err(validationResult.error);
      }

      return Ok(gpsPoint);
    } catch (error) {
      console.error('Error getting current location:', error);
      return Err('TIMEOUT');
    }
  }

  isTracking(): boolean {
    return this.isCurrentlyTracking && !this.isPaused;
  }

  getTrackingPoints(): GPSPoint[] {
    return [...this.trackingPoints];
  }

  clearTrackingPoints(): void {
    this.trackingPoints = [];
    this.lastValidLocation = null;
  }

  // Private helper methods

  private async requestPermissions(): Promise<Result<void, GPSError>> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return Err('PERMISSION_DENIED');
      }

      return Ok(undefined);
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return Err('PERMISSION_DENIED');
    }
  }

  private handleLocationUpdate(location: Location.LocationObject): void {
    try {
      const gpsPoint = this.locationToGPSPoint(location);
      const validationResult = this.validateGPSPoint(gpsPoint);

      if (validationResult.success) {
        // Check for duplicate or too frequent points
        if (this.shouldAddPoint(gpsPoint)) {
          this.trackingPoints.push(gpsPoint);
          this.lastValidLocation = gpsPoint;
        }
      } else {
        console.warn('Invalid GPS point received:', validationResult.error);
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  private locationToGPSPoint(location: Location.LocationObject): GPSPoint {
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude ?? undefined,
      timestamp: new Date(location.timestamp),
      accuracy: location.coords.accuracy ?? undefined,
    };
  }

  private validateGPSPoint(point: GPSPoint): Result<GPSPoint, GPSError> {
    // Check basic validity (explicit numeric checks; allow 0 values)
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      return Err('INVALID_LOCATION');
    }

    // Check latitude bounds
    if (point.latitude < -90 || point.latitude > 90) {
      return Err('INVALID_LOCATION');
    }

    // Check longitude bounds
    if (point.longitude < -180 || point.longitude > 180) {
      return Err('INVALID_LOCATION');
    }

    // Check accuracy threshold
    if (typeof point.accuracy === 'number' && point.accuracy > this.MAX_ACCURACY_THRESHOLD) {
      // Allow the very first point even if accuracy is poor to exit "acquiring" state;
      // subsequent points will improve accuracy and validation will apply normally.
      if (this.lastValidLocation) {
        return Err('ACCURACY_TOO_LOW');
      }
    }

    // Check for unrealistic speed (if we have a previous point)
    if (this.lastValidLocation) {
      const speed = this.calculateSpeed(this.lastValidLocation, point);
      if (speed > this.MAX_SPEED_THRESHOLD) {
        return Err('INVALID_LOCATION');
      }
    }

    return Ok(point);
  }

  private shouldAddPoint(newPoint: GPSPoint): boolean {
    if (!this.lastValidLocation) {
      return true;
    }

    // Check time interval
    const timeDiff = newPoint.timestamp.getTime() - this.lastValidLocation.timestamp.getTime();
    if (timeDiff < this.MIN_TIME_BETWEEN_POINTS) {
      return false;
    }

    // Check if we've moved enough distance
    const distance = this.calculateDistance(this.lastValidLocation, newPoint);
    return distance >= this.MIN_DISTANCE_INTERVAL;
  }

  private calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
    // Haversine formula for calculating distance between two GPS points
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
      Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateSpeed(point1: GPSPoint, point2: GPSPoint): number {
    // Calculate speed in km/h
    const distance = this.calculateDistance(point1, point2); // meters
    const timeDiff = (point2.timestamp.getTime() - point1.timestamp.getTime()) / 1000; // seconds

    if (timeDiff === 0) return 0;

    const speedMs = distance / timeDiff; // meters per second
    return (speedMs * 3.6); // convert to km/h
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
