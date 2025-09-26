import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferences, UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { IUserPreferencesRepository } from '@/domain/repositories/IUserPreferencesRepository';
import { Result } from '@/shared/types';

const STORAGE_KEY = '@PersonalRunningTracker:userPreferences';

export class AsyncStorageUserPreferencesRepository implements IUserPreferencesRepository {
  async get(): Promise<Result<UserPreferencesEntity, string>> {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);

      if (!storedData) {
        // Return default preferences if none exist
        const defaultPreferences = UserPreferencesEntity.createDefault();
        return { success: true, data: defaultPreferences };
      }

      const parsedData: UserPreferences = JSON.parse(storedData);
      const preferences = UserPreferencesEntity.fromJSON(parsedData);

      return { success: true, data: preferences };
    } catch (error) {
      console.error('Failed to get user preferences:', error);

      // If there's an error reading preferences, return defaults
      const defaultPreferences = UserPreferencesEntity.createDefault();
      return { success: true, data: defaultPreferences };
    }
  }

  async save(preferences: UserPreferencesEntity): Promise<Result<void, string>> {
    try {
      const dataToStore = JSON.stringify(preferences.toJSON());
      await AsyncStorage.setItem(STORAGE_KEY, dataToStore);

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      return {
        success: false,
        error: `Failed to save preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async clear(): Promise<Result<void, string>> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return { success: true, data: undefined };
    } catch (error) {
      console.error('Failed to clear user preferences:', error);
      return {
        success: false,
        error: `Failed to clear preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Additional utility methods
  async migrate(): Promise<Result<void, string>> {
    try {
      const currentPreferences = await this.get();

      if (!currentPreferences.success) {
        return { success: false, error: currentPreferences.error };
      }

      // Check if migration is needed (e.g., version mismatch)
      const currentVersion = currentPreferences.data.version;
      const expectedVersion = '1.0.0';

      if (currentVersion !== expectedVersion) {
        // Perform any necessary migrations here
        const updatedPreferences = currentPreferences.data.updatePreference('version', expectedVersion);
        return await this.save(updatedPreferences);
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Failed to migrate user preferences:', error);
      return {
        success: false,
        error: `Failed to migrate preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async isFirstLaunch(): Promise<boolean> {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      return storedData === null;
    } catch (error) {
      console.error('Failed to check first launch:', error);
      return true; // Assume first launch on error
    }
  }
}