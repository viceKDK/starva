import { UserPreferencesEntity } from '@/domain/entities/UserPreferences';
import { IUserPreferencesRepository } from '@/domain/repositories/IUserPreferencesRepository';
import { Result } from '@/shared/types';

export class GetUserPreferencesUseCase {
  constructor(private preferencesRepository: IUserPreferencesRepository) {}

  async execute(): Promise<Result<UserPreferencesEntity, string>> {
    try {
      const result = await this.preferencesRepository.get();

      if (!result.success) {
        console.warn('Failed to get preferences, using defaults:', result.error);
        // Return defaults if loading fails
        return { success: true, data: UserPreferencesEntity.createDefault() };
      }

      return result;
    } catch (error) {
      console.error('GetUserPreferencesUseCase error:', error);
      // Return defaults on any error
      return { success: true, data: UserPreferencesEntity.createDefault() };
    }
  }
}