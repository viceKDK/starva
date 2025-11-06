import { UserPreferencesEntity } from '../entities/UserPreferences';
import { Result } from '@/shared/types';

export interface IUserPreferencesRepository {
  get(): Promise<Result<UserPreferencesEntity, string>>;
  save(preferences: UserPreferencesEntity): Promise<Result<void, string>>;
  clear(): Promise<Result<void, string>>;
}
