import { UserPreferences, UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { IUserPreferencesRepository } from '@/domain/repositories/IUserPreferencesRepository';
import { Result } from '@/shared/types';

export class UpdateUserPreferencesUseCase {
  constructor(private preferencesRepository: IUserPreferencesRepository) {}

  async execute<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<Result<UserPreferencesEntity, string>> {
    try {
      // Get current preferences
      const currentResult = await this.preferencesRepository.get();

      if (!currentResult.success) {
        return {
          success: false,
          error: `Failed to get current preferences: ${currentResult.error}`
        };
      }

      // Update the specific preference
      const updatedPreferences = currentResult.data.updatePreference(key, value);

      // Save updated preferences
      const saveResult = await this.preferencesRepository.save(updatedPreferences);

      if (!saveResult.success) {
        return {
          success: false,
          error: `Failed to save preferences: ${saveResult.error}`
        };
      }

      return { success: true, data: updatedPreferences };
    } catch (error) {
      console.error('UpdateUserPreferencesUseCase error:', error);
      return {
        success: false,
        error: `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async executeMultiple(
    updates: Partial<UserPreferences>
  ): Promise<Result<UserPreferencesEntity, string>> {
    try {
      // Get current preferences
      const currentResult = await this.preferencesRepository.get();

      if (!currentResult.success) {
        return {
          success: false,
          error: `Failed to get current preferences: ${currentResult.error}`
        };
      }

      // Apply all updates
      let updatedPreferences = currentResult.data;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          updatedPreferences = updatedPreferences.updatePreference(
            key as keyof UserPreferences,
            value
          );
        }
      }

      // Save updated preferences
      const saveResult = await this.preferencesRepository.save(updatedPreferences);

      if (!saveResult.success) {
        return {
          success: false,
          error: `Failed to save preferences: ${saveResult.error}`
        };
      }

      return { success: true, data: updatedPreferences };
    } catch (error) {
      console.error('UpdateUserPreferencesUseCase executeMultiple error:', error);
      return {
        success: false,
        error: `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}