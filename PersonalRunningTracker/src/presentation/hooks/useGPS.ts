// Custom React hook for GPS functionality
import { useState, useCallback, useRef, useEffect } from 'react';
import { GPSPoint } from '@/domain/entities';
import { GPSError } from '@/domain/types';
import { ExpoGPSService } from '@/infrastructure/gps/ExpoGPSService';
import { calculateTotalDistance, formatDistance, formatPace, calculateAveragePace } from '@/shared/utils';

export interface GPSState {
  isTracking: boolean;
  isPaused: boolean;
  currentLocation: GPSPoint | null;
  trackingPoints: GPSPoint[];
  error: GPSError | null;
  isLoading: boolean;
}

export interface GPSMetrics {
  distance: number; // meters
  duration: number; // seconds
  pace: number; // seconds per km
  formattedDistance: string;
  formattedPace: string;
  formattedDuration: string;
  pointCount: number;
}

export interface UseGPSReturn {
  state: GPSState;
  metrics: GPSMetrics;
  actions: {
    startTracking: () => Promise<boolean>;
    stopTracking: () => Promise<GPSPoint[]>;
    pauseTracking: () => Promise<boolean>;
    resumeTracking: () => Promise<boolean>;
    getCurrentLocation: () => Promise<GPSPoint | null>;
    clearError: () => void;
    clearTracking: () => void;
  };
}

export const useGPS = (): UseGPSReturn => {
  const gpsService = useRef(new ExpoGPSService()).current;
  const startTime = useRef<Date | null>(null);
  const pausedDuration = useRef<number>(0);
  const pauseStartTime = useRef<Date | null>(null);

  const [state, setState] = useState<GPSState>({
    isTracking: false,
    isPaused: false,
    currentLocation: null,
    trackingPoints: [],
    error: null,
    isLoading: false,
  });

  // Calculate real-time metrics
  const metrics: GPSMetrics = {
    distance: calculateTotalDistance(state.trackingPoints),
    duration: calculateDuration(),
    pace: calculateAveragePace(state.trackingPoints),
    formattedDistance: formatDistance(calculateTotalDistance(state.trackingPoints)),
    formattedPace: formatPace(calculateAveragePace(state.trackingPoints)),
    formattedDuration: formatDuration(calculateDuration()),
    pointCount: state.trackingPoints.length,
  };

  function calculateDuration(): number {
    if (!startTime.current) return 0;

    const now = new Date();
    const totalElapsed = (now.getTime() - startTime.current.getTime()) / 1000;

    // If currently paused, add current pause duration
    let currentPauseDuration = 0;
    if (state.isPaused && pauseStartTime.current) {
      currentPauseDuration = (now.getTime() - pauseStartTime.current.getTime()) / 1000;
    }

    return Math.max(0, totalElapsed - pausedDuration.current - currentPauseDuration);
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  const startTracking = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await gpsService.startTracking();

      if (result.success) {
        startTime.current = new Date();
        pausedDuration.current = 0;
        pauseStartTime.current = null;

        setState(prev => ({
          ...prev,
          isTracking: true,
          isPaused: false,
          isLoading: false,
          error: null,
          trackingPoints: [],
        }));

        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'UNKNOWN_ERROR',
      }));
      return false;
    }
  }, [gpsService]);

  const stopTracking = useCallback(async (): Promise<GPSPoint[]> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await gpsService.stopTracking();

      if (result.success) {
        // Calculate final paused duration if currently paused
        if (state.isPaused && pauseStartTime.current) {
          const finalPauseDuration = (new Date().getTime() - pauseStartTime.current.getTime()) / 1000;
          pausedDuration.current += finalPauseDuration;
        }

        setState(prev => ({
          ...prev,
          isTracking: false,
          isPaused: false,
          isLoading: false,
          trackingPoints: result.data,
        }));

        // Reset timing
        startTime.current = null;
        pausedDuration.current = 0;
        pauseStartTime.current = null;

        return result.data;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return [];
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'UNKNOWN_ERROR',
      }));
      return [];
    }
  }, [gpsService, state.isPaused]);

  const pauseTracking = useCallback(async (): Promise<boolean> => {
    try {
      const result = await gpsService.pauseTracking();

      if (result.success) {
        pauseStartTime.current = new Date();
        setState(prev => ({ ...prev, isPaused: true }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'UNKNOWN_ERROR' }));
      return false;
    }
  }, [gpsService]);

  const resumeTracking = useCallback(async (): Promise<boolean> => {
    try {
      const result = await gpsService.resumeTracking();

      if (result.success) {
        // Add paused duration to total
        if (pauseStartTime.current) {
          const pauseDuration = (new Date().getTime() - pauseStartTime.current.getTime()) / 1000;
          pausedDuration.current += pauseDuration;
          pauseStartTime.current = null;
        }

        setState(prev => ({ ...prev, isPaused: false }));
        return true;
      } else {
        setState(prev => ({ ...prev, error: result.error }));
        return false;
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'UNKNOWN_ERROR' }));
      return false;
    }
  }, [gpsService]);

  const getCurrentLocation = useCallback(async (): Promise<GPSPoint | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await gpsService.getCurrentLocation();

      if (result.success) {
        setState(prev => ({
          ...prev,
          currentLocation: result.data,
          isLoading: false,
        }));
        return result.data;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error,
        }));
        return null;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'UNKNOWN_ERROR',
      }));
      return null;
    }
  }, [gpsService]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearTracking = useCallback(() => {
    gpsService.clearTrackingPoints();
    setState(prev => ({
      ...prev,
      trackingPoints: [],
      currentLocation: null,
      error: null,
    }));
    startTime.current = null;
    pausedDuration.current = 0;
    pauseStartTime.current = null;
  }, [gpsService]);

  // Update tracking points from service periodically
  useEffect(() => {
    if (!state.isTracking) return;

    const interval = setInterval(() => {
      const points = gpsService.getTrackingPoints();
      setState(prev => ({
        ...prev,
        trackingPoints: points,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isTracking, gpsService]);

  return {
    state,
    metrics,
    actions: {
      startTracking,
      stopTracking,
      pauseTracking,
      resumeTracking,
      getCurrentLocation,
      clearError,
      clearTracking,
    },
  };
};