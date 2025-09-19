// GPS service interface with Result pattern for error handling
import { GPSPoint } from '../entities';
import { GPSError } from '../types';
import { Result } from '@/shared/types';

export interface IGPSService {
  startTracking(): Promise<Result<void, GPSError>>;
  stopTracking(): Promise<Result<GPSPoint[], GPSError>>;
  pauseTracking(): Promise<Result<void, GPSError>>;
  resumeTracking(): Promise<Result<void, GPSError>>;
  getCurrentLocation(): Promise<Result<GPSPoint, GPSError>>;
  isTracking(): boolean;
  getTrackingPoints(): GPSPoint[];
  clearTrackingPoints(): void;
}