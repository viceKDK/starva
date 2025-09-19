import { UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { IUserPreferencesRepository } from '@/domain/repositories/IUserPreferencesRepository';
import { Result } from '@/shared/types';

export class ResetUserPreferencesUseCase {
  constructor(private preferencesRepository: IUserPreferencesRepository) {}

  async execute(): Promise<Result<UserPreferencesEntity, string>> {
    try {
      // Create default preferences
      const defaultPreferences = UserPreferencesEntity.createDefault();

      // Save defaults
      const saveResult = await this.preferencesRepository.save(defaultPreferences);

      if (!saveResult.success) {
        return {
          success: false,
          error: `Failed to reset preferences: ${saveResult.error}`
        };
      }

      return { success: true, data: defaultPreferences };
    } catch (error) {
      console.error('ResetUserPreferencesUseCase error:', error);
      return {
        success: false,
        error: `Failed to reset preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}