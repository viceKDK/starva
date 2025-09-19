import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StartRunTrackingUseCase,
  PauseRunTrackingUseCase,
  ResumeRunTrackingUseCase,
  StopRunTrackingUseCase,
  StopTrackingResult
} from '@/application/usecases';
import { IGPSService, DatabaseError } from '@/domain/repositories';
import { GPSPoint } from '@/domain/entities';
import { GPSError } from '@/domain/types';
import { SessionStorageService, SessionData } from '@/infrastructure/storage/SessionStorageService';

import { RunSessionState } from './RunSessionState';

export enum GPSStatus {
  UNKNOWN = 'UNKNOWN',
  ACQUIRING = 'ACQUIRING',
  WEAK = 'WEAK',
  GOOD = 'GOOD',
  EXCELLENT = 'EXCELLENT',
  ERROR = 'ERROR'
}

export interface RunMetrics {
  duration: number; // seconds
  distance: number; // meters
  pace: number; // seconds per km
  currentSpeed: number; // m/s
}

export interface UseRunTrackingControllerResult {
  sessionState: RunSessionState;
  metrics: RunMetrics;
  gpsStatus: GPSStatus;
  gpsAccuracy: number | null;
  isLoading: boolean;
  error: string | null;
  startTracking: () => Promise<void>;
  pauseTracking: () => Promise<void>;
  resumeTracking: () => Promise<void>;
  stopTracking: () => Promise<StopTrackingResult | null>;
  clearError: () => void;
}

export const useRunTrackingController = (
  gpsService: IGPSService,
  useCases: {
    startUseCase: StartRunTrackingUseCase;
    pauseUseCase: PauseRunTrackingUseCase;
    resumeUseCase: ResumeRunTrackingUseCase;
    stopUseCase: StopRunTrackingUseCase;
  }
): UseRunTrackingControllerResult => {
  const [sessionState, setSessionState] = useState<RunSessionState>(RunSessionState.READY);
  const [metrics, setMetrics] = useState<RunMetrics>({
    duration: 0,
    distance: 0,
    pace: 0,
    currentSpeed: 0
  });
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>(GPSStatus.UNKNOWN);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking session data
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(0); // Total paused time in seconds
  const lastPauseStartRef = useRef<Date | null>(null);
  // Removed unused lastLocationRef
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const acquireTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate current metrics based on GPS tracking points
  const calculateMetrics = useCallback((): RunMetrics => {
    if (!startTimeRef.current || sessionState === RunSessionState.READY) {
      return { duration: 0, distance: 0, pace: 0, currentSpeed: 0 };
    }

    const trackingPoints = gpsService.getTrackingPoints();
    if (trackingPoints.length === 0) {
      return { duration: 0, distance: 0, pace: 0, currentSpeed: 0 };
    }

    // Calculate duration
    const now = new Date();
    const totalElapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
    const pausedTime = sessionState === RunSessionState.PAUSED
      ? pausedTimeRef.current + Math.floor((now.getTime() - (lastPauseStartRef.current?.getTime() || now.getTime())) / 1000)
      : pausedTimeRef.current;
    const duration = Math.max(0, totalElapsed - pausedTime);

    // Calculate distance
    let distance = 0;
    for (let i = 1; i < trackingPoints.length; i++) {
      distance += calculateDistance(trackingPoints[i - 1]!, trackingPoints[i]!);
    }

    // Calculate pace (seconds per km)
    const pace = distance > 0 ? (duration / (distance / 1000)) : 0;

    // Calculate current speed (using last few points)
    let currentSpeed = 0;
    if (trackingPoints.length >= 2) {
      const recentPoints = trackingPoints.slice(-3); // Use last 3 points for smoothing
      if (recentPoints.length >= 2) {
        const recentDistance = calculateDistance(
          recentPoints[0]!,
          recentPoints[recentPoints.length - 1]!
        );
        const timeSpan = (recentPoints[recentPoints.length - 1]!.timestamp.getTime() -
                         recentPoints[0]!.timestamp.getTime()) / 1000;
        currentSpeed = timeSpan > 0 ? recentDistance / timeSpan : 0;
      }
    }

    return { duration, distance, pace, currentSpeed };
  }, [gpsService, sessionState]);

  // Update GPS status based on accuracy
  const updateGpsStatus = useCallback((accuracy: number | undefined) => {
    if (!accuracy) {
      setGpsStatus(GPSStatus.UNKNOWN);
      setGpsAccuracy(null);
      return;
    }

    setGpsAccuracy(accuracy);

    if (accuracy <= 5) {
      setGpsStatus(GPSStatus.EXCELLENT);
    } else if (accuracy <= 10) {
      setGpsStatus(GPSStatus.GOOD);
    } else if (accuracy <= 15) {
      setGpsStatus(GPSStatus.WEAK);
    } else {
      setGpsStatus(GPSStatus.ERROR);
    }
  }, []);

  // Auto-save session data to storage
  const saveSessionToStorage = useCallback(async () => {
    try {
      if (!startTimeRef.current || !sessionIdRef.current) return;

      const trackingPoints = gpsService.getTrackingPoints();
      const sessionData: SessionData = {
        sessionState,
        startTime: startTimeRef.current.toISOString(),
        pausedTime: pausedTimeRef.current,
        lastPauseStart: lastPauseStartRef.current?.toISOString() || null,
        trackingPoints,
        sessionId: sessionIdRef.current
      };

      await SessionStorageService.saveSession(sessionData);
    } catch (error) {
      console.error('Failed to auto-save session:', error);
    }
  }, [sessionState, gpsService]);

  // Start auto-save interval
  const startAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }

    autoSaveIntervalRef.current = setInterval(() => {
      if (sessionState === RunSessionState.TRACKING || sessionState === RunSessionState.PAUSED) {
        saveSessionToStorage();
      }
    }, 30000); // Save every 30 seconds
  }, [sessionState, saveSessionToStorage]);

  // Stop auto-save interval
  const stopAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  }, []);

  // Start tracking session
  const startTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSessionState(RunSessionState.STARTING);
      setGpsStatus(GPSStatus.ACQUIRING);

      const result = await useCases.startUseCase.execute();
      if (!result.success) {
        setError(getErrorMessage(result.error));
        setSessionState(RunSessionState.READY);
        return;
      }

      startTimeRef.current = new Date();
      pausedTimeRef.current = 0;
      lastPauseStartRef.current = null;
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionState(RunSessionState.TRACKING);

      // Start auto-save interval
      startAutoSave();

      // Start a timeout for GPS acquisition
      if (acquireTimeoutRef.current) clearTimeout(acquireTimeoutRef.current);
      acquireTimeoutRef.current = setTimeout(() => {
        const points = gpsService.getTrackingPoints();
        if (points.length === 0) {
          setGpsStatus(GPSStatus.ERROR);
          setError(getErrorMessage('TIMEOUT' as GPSError));
        }
      }, 10000);

      // Start metrics update interval
      updateIntervalRef.current = setInterval(() => {
        if (sessionState === RunSessionState.TRACKING) {
          setMetrics(calculateMetrics());

          // Update GPS status
          const points = gpsService.getTrackingPoints();
          if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            updateGpsStatus(lastPoint?.accuracy);
            // Clear acquire timeout upon receiving first point
            if (acquireTimeoutRef.current) {
              clearTimeout(acquireTimeoutRef.current);
              acquireTimeoutRef.current = null;
            }
          }
        }
      }, 1000);

    } catch (err) {
      setError('Failed to start tracking');
      setSessionState(RunSessionState.READY);
    } finally {
      setIsLoading(false);
    }
  }, [useCases.startUseCase, calculateMetrics, updateGpsStatus, sessionState]);

  // Pause tracking session
  const pauseTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await useCases.pauseUseCase.execute();
      if (!result.success) {
        setError(getErrorMessage(result.error));
        return;
      }

      lastPauseStartRef.current = new Date();
      setSessionState(RunSessionState.PAUSED);
    } catch (err) {
      setError('Failed to pause tracking');
    } finally {
      setIsLoading(false);
    }
  }, [useCases.pauseUseCase]);

  // Resume tracking session
  const resumeTracking = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await useCases.resumeUseCase.execute();
      if (!result.success) {
        setError(getErrorMessage(result.error));
        return;
      }

      // Update total paused time
      if (lastPauseStartRef.current) {
        const pauseDuration = Math.floor((new Date().getTime() - lastPauseStartRef.current.getTime()) / 1000);
        pausedTimeRef.current += pauseDuration;
        lastPauseStartRef.current = null;
      }

      setSessionState(RunSessionState.TRACKING);
    } catch (err) {
      setError('Failed to resume tracking');
    } finally {
      setIsLoading(false);
    }
  }, [useCases.resumeUseCase]);

  // Stop tracking session
  const stopTracking = useCallback(async (): Promise<StopTrackingResult | null> => {
    try {
      setIsLoading(true);
      setSessionState(RunSessionState.STOPPING);

      const result = await useCases.stopUseCase.execute();
      if (!result.success) {
        setError(getErrorMessage(result.error));
        setSessionState(RunSessionState.TRACKING);
        return null;
      }

      // Clean up
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (acquireTimeoutRef.current) {
        clearTimeout(acquireTimeoutRef.current);
        acquireTimeoutRef.current = null;
      }

      // Stop auto-save and clear session storage
      stopAutoSave();
      await SessionStorageService.clearSession();

      // Reset state
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      lastPauseStartRef.current = null;
      sessionIdRef.current = null;
      setSessionState(RunSessionState.STOPPED);
      setMetrics({ duration: 0, distance: 0, pace: 0, currentSpeed: 0 });
      setGpsStatus(GPSStatus.UNKNOWN);
      setGpsAccuracy(null);

      return result.data;
    } catch (err) {
      setError('Failed to stop tracking');
      setSessionState(RunSessionState.TRACKING);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [useCases.stopUseCase]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (acquireTimeoutRef.current) {
        clearTimeout(acquireTimeoutRef.current);
      }
    };
  }, []);

  return {
    sessionState,
    metrics,
    gpsStatus,
    gpsAccuracy,
    isLoading,
    error,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    clearError
  };
};

// Helper functions
function calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
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

function getErrorMessage(error: GPSError | DatabaseError): string {
  const gpsErrorMessages: Record<GPSError, string> = {
    PERMISSION_DENIED: 'Location permission is required to track your runs',
    GPS_DISABLED: 'GPS is disabled. Please enable location services in your device settings',
    SIGNAL_LOST: 'GPS signal lost. Please ensure you have a clear view of the sky',
    TIMEOUT: 'Unable to acquire GPS location within timeout period',
    ACCURACY_TOO_LOW: 'GPS accuracy is too low for reliable tracking',
    INVALID_LOCATION: 'Invalid location data received from GPS',
    SERVICE_UNAVAILABLE: 'Location service is temporarily unavailable',
    UNKNOWN_ERROR: 'An unexpected error occurred while accessing GPS'
  };

  const databaseErrorMessages: Record<DatabaseError, string> = {
    CONNECTION_FAILED: 'Database connection failed',
    SAVE_FAILED: 'Failed to save run data',
    NOT_FOUND: 'Run not found',
    DELETE_FAILED: 'Failed to delete run',
    QUERY_FAILED: 'Database query failed',
    VALIDATION_FAILED: 'Run data invalid (too short or GPS data inaccurate)',
    MIGRATION_FAILED: 'Database migration failed'
  };

  return gpsErrorMessages[error as GPSError] || databaseErrorMessages[error as DatabaseError] || 'An unexpected error occurred';
}
