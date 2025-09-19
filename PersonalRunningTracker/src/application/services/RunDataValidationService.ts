import { Run, GPSPoint } from '@/domain/entities';

export interface RunValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RunValidationConfig {
  minDuration: number; // seconds
  maxDuration: number; // seconds
  minDistance: number; // meters
  maxDistance: number; // meters
  minAveragePace: number; // seconds per km
  maxAveragePace: number; // seconds per km
  requiredFields: (keyof Run)[];
}

export class RunDataValidationService {
  private readonly config: RunValidationConfig;

  constructor(config?: Partial<RunValidationConfig>) {
    this.config = {
      minDuration: 60, // 1 minute minimum
      maxDuration: 86400, // 24 hours maximum
      minDistance: 100, // 100 meters minimum
      maxDistance: 100000, // 100 km maximum
      minAveragePace: 120, // 2:00 min/km (very fast)
      maxAveragePace: 1800, // 30:00 min/km (very slow)
      requiredFields: ['startTime', 'endTime', 'distance', 'duration'],
      ...config
    };
  }

  validateRun(run: Partial<Run>): RunValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    this.validateRequiredFields(run, errors);

    // Validate temporal data
    this.validateTemporalData(run, errors, warnings);

    // Validate distance
    this.validateDistance(run, errors, warnings);

    // Validate pace
    this.validatePace(run, errors, warnings);

    // Validate GPS data consistency
    this.validateGPSConsistency(run, errors, warnings);

    // Validate data relationships
    this.validateDataRelationships(run, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRequiredFields(run: Partial<Run>, errors: string[]): void {
    for (const field of this.config.requiredFields) {
      if (run[field] === undefined || run[field] === null) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
  }

  private validateTemporalData(run: Partial<Run>, errors: string[], warnings: string[]): void {
    if (!run.startTime || !run.endTime) return;

    // Check that end time is after start time
    if (run.endTime <= run.startTime) {
      errors.push('End time must be after start time');
      return;
    }

    // Check duration consistency
    const calculatedDuration = Math.floor((run.endTime.getTime() - run.startTime.getTime()) / 1000);
    if (run.duration !== undefined && Math.abs(calculatedDuration - run.duration) > 60) {
      warnings.push(`Duration mismatch: calculated ${calculatedDuration}s vs stored ${run.duration}s`);
    }

    // Check duration bounds
    if (run.duration !== undefined) {
      if (run.duration < this.config.minDuration) {
        errors.push(`Duration too short: ${run.duration}s (minimum: ${this.config.minDuration}s)`);
      }
      if (run.duration > this.config.maxDuration) {
        warnings.push(`Very long run: ${run.duration}s (${Math.round(run.duration / 3600)} hours)`);
      }
    }

    // Check for future dates
    const now = new Date();
    if (run.startTime > now) {
      errors.push('Start time cannot be in the future');
    }
    if (run.endTime > now) {
      errors.push('End time cannot be in the future');
    }
  }

  private validateDistance(run: Partial<Run>, errors: string[], warnings: string[]): void {
    if (run.distance === undefined) return;

    if (run.distance < this.config.minDistance) {
      errors.push(`Distance too short: ${run.distance}m (minimum: ${this.config.minDistance}m)`);
    }

    if (run.distance > this.config.maxDistance) {
      warnings.push(`Very long distance: ${(run.distance / 1000).toFixed(2)}km`);
    }

    // Check for negative distance
    if (run.distance < 0) {
      errors.push('Distance cannot be negative');
    }
  }

  private validatePace(run: Partial<Run>, errors: string[], warnings: string[]): void {
    if (run.averagePace === undefined || run.distance === undefined || run.duration === undefined) return;

    // Calculate expected pace from distance and duration
    const expectedPace = (run.duration / (run.distance / 1000)); // seconds per km
    const paceDifference = Math.abs(expectedPace - run.averagePace);

    if (paceDifference > 60) { // More than 1 minute difference
      warnings.push(`Pace inconsistency: calculated ${this.formatPace(expectedPace)} vs stored ${this.formatPace(run.averagePace)}`);
    }

    // Check pace bounds
    if (run.averagePace < this.config.minAveragePace) {
      warnings.push(`Very fast pace: ${this.formatPace(run.averagePace)}/km`);
    }

    if (run.averagePace > this.config.maxAveragePace) {
      warnings.push(`Very slow pace: ${this.formatPace(run.averagePace)}/km`);
    }

    // Check for invalid pace values
    if (run.averagePace <= 0 || !isFinite(run.averagePace)) {
      errors.push('Invalid average pace value');
    }
  }

  private validateGPSConsistency(run: Partial<Run>, errors: string[], warnings: string[]): void {
    if (!run.route || run.route.length === 0) {
      warnings.push('No GPS route data available');
      return;
    }

    const route = run.route;

    // Check minimum GPS points
    if (route.length < 2) {
      warnings.push('Insufficient GPS points for route validation');
      return;
    }

    // Validate GPS timestamps
    this.validateGPSTimestamps(route, run, errors, warnings);

    // Calculate distance from GPS and compare with stored distance
    this.validateGPSDistance(route, run, warnings);

    // Check for GPS data quality issues
    this.validateGPSQuality(route, warnings);
  }

  private validateGPSTimestamps(route: GPSPoint[], run: Partial<Run>, errors: string[], warnings: string[]): void {
    // Check that GPS timestamps are within run duration
    if (run.startTime && run.endTime) {
      const firstGPS = route[0].timestamp;
      const lastGPS = route[route.length - 1].timestamp;

      if (firstGPS < run.startTime || firstGPS > run.endTime) {
        warnings.push('First GPS point timestamp outside run duration');
      }

      if (lastGPS < run.startTime || lastGPS > run.endTime) {
        warnings.push('Last GPS point timestamp outside run duration');
      }
    }

    // Check for chronological order
    for (let i = 1; i < route.length; i++) {
      if (route[i].timestamp <= route[i - 1].timestamp) {
        warnings.push(`GPS timestamps not in chronological order at point ${i}`);
        break;
      }
    }
  }

  private validateGPSDistance(route: GPSPoint[], run: Partial<Run>, warnings: string[]): void {
    if (run.distance === undefined) return;

    const calculatedDistance = this.calculateRouteDistance(route);
    const distanceDifference = Math.abs(calculatedDistance - run.distance);
    const percentageDifference = (distanceDifference / run.distance) * 100;

    if (percentageDifference > 20) { // More than 20% difference
      warnings.push(
        `GPS distance mismatch: calculated ${calculatedDistance.toFixed(0)}m vs stored ${run.distance.toFixed(0)}m (${percentageDifference.toFixed(1)}% difference)`
      );
    }
  }

  private validateGPSQuality(route: GPSPoint[], warnings: string[]): void {
    // Check for accuracy data
    const pointsWithAccuracy = route.filter(p => p.accuracy != null);
    if (pointsWithAccuracy.length === 0) {
      warnings.push('No GPS accuracy data available');
      return;
    }

    // Check average accuracy
    const avgAccuracy = pointsWithAccuracy.reduce((sum, p) => sum + (p.accuracy || 0), 0) / pointsWithAccuracy.length;
    if (avgAccuracy > 20) {
      warnings.push(`Poor GPS accuracy: average ${avgAccuracy.toFixed(1)}m`);
    }

    // Check for large gaps in GPS data
    for (let i = 1; i < route.length; i++) {
      const timeDiff = (route[i].timestamp.getTime() - route[i - 1].timestamp.getTime()) / 1000;
      if (timeDiff > 60) { // More than 1 minute gap
        warnings.push(`Large GPS data gap: ${Math.round(timeDiff)}s between points`);
      }
    }
  }

  private validateDataRelationships(run: Partial<Run>, errors: string[], warnings: string[]): void {
    // Validate that calculated metrics make sense together
    if (run.distance && run.duration && run.averagePace) {
      const expectedAveragePace = run.duration / (run.distance / 1000);
      const paceError = Math.abs(expectedAveragePace - run.averagePace) / expectedAveragePace;

      if (paceError > 0.1) { // More than 10% error
        warnings.push('Inconsistent relationship between distance, duration, and pace');
      }
    }

    // Check name length
    if (run.name && run.name.length > 100) {
      warnings.push('Run name is very long');
    }

    // Check notes length
    if (run.notes && run.notes.length > 1000) {
      warnings.push('Run notes are very long');
    }
  }

  private calculateRouteDistance(route: GPSPoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(route[i - 1], route[i]);
    }
    return totalDistance;
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

  private formatPace(secondsPerKm: number): string {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}