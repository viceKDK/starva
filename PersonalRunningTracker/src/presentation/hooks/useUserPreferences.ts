import { useState, useEffect } from 'react';
import { UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { GetUserPreferencesUseCase, UpdateUserPreferencesUseCase } from '@/application/usecases';
import { AsyncStorageUserPreferencesRepository } from '@/infrastructure/storage/AsyncStorageUserPreferencesRepository';

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferencesEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize use cases
  const preferencesRepository = new AsyncStorageUserPreferencesRepository();
  const getPreferencesUseCase = new GetUserPreferencesUseCase(preferencesRepository);
  const updatePreferencesUseCase = new UpdateUserPreferencesUseCase(preferencesRepository);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPreferencesUseCase.execute();
      if (result.success) {
        setPreferences(result.data);
      } else {
        setError(result.error);
        // Still set default preferences even if loading fails
        setPreferences(UserPreferencesEntity.createDefault());
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load preferences');
      setPreferences(UserPreferencesEntity.createDefault());
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async <K extends keyof UserPreferencesEntity>(
    key: K,
    value: any
  ): Promise<boolean> => {
    if (!preferences) return false;

    try {
      const result = await updatePreferencesUseCase.execute(key as any, value);
      if (result.success) {
        setPreferences(result.data);
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      console.error('Failed to update preference:', err);
      setError('Failed to update preference');
      return false;
    }
  };

  const formatDistance = (distanceMeters: number): string => {
    if (!preferences) return `${(distanceMeters / 1000).toFixed(2)} km`;
    return preferences.formatDistance(distanceMeters);
  };

  const formatPace = (secondsPerKm: number): string => {
    if (!preferences) {
      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.floor(secondsPerKm % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
    }
    return preferences.formatPace(secondsPerKm);
  };

  const convertDistance = (distanceMeters: number): number => {
    if (!preferences) return distanceMeters / 1000;
    return preferences.convertDistance(distanceMeters);
  };

  const getDistanceUnit = (): string => {
    if (!preferences) return 'km';
    return preferences.getDistanceShortLabel();
  };

  const getPaceLabel = (): string => {
    if (!preferences) return 'min/km';
    return preferences.getPaceLabel();
  };

  return {
    preferences,
    isLoading,
    error,
    loadPreferences,
    updatePreference,
    formatDistance,
    formatPace,
    convertDistance,
    getDistanceUnit,
    getPaceLabel
  };
};