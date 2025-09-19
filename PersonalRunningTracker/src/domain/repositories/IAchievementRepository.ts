import { Achievement, AchievementId, AchievementType, AchievementCriteria } from '../entities/Achievement';
import { Result } from '@/shared/types';

export interface IAchievementRepository {
  save(achievement: Achievement): Promise<Result<void, string>>;
  findById(id: AchievementId): Promise<Result<Achievement | null, string>>;
  findByType(type: AchievementType): Promise<Result<Achievement[], string>>;
  findByTypeAndCriteria(type: AchievementType, criteria: AchievementCriteria): Promise<Result<Achievement | null, string>>;
  findAll(): Promise<Result<Achievement[], string>>;
  findEarnedAchievements(): Promise<Result<Achievement[], string>>;
  deleteById(id: AchievementId): Promise<Result<void, string>>;
  deleteAll(): Promise<Result<void, string>>;
}