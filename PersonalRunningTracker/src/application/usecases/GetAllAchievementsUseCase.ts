import { Achievement } from '@/domain/entities/Achievement';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import { Result } from '@/shared/types';

export interface AchievementProgress {
  type: string;
  title: string;
  description: string;
  progress: number; // 0-1
  isEarned: boolean;
  current: number;
  target: number;
  achievement?: Achievement;
}

export class GetAllAchievementsUseCase {
  constructor(private achievementRepository: IAchievementRepository) {}

  async execute(): Promise<Result<Achievement[], string>> {
    try {
      const result = await this.achievementRepository.findEarnedAchievements();

      if (!result.success) {
        return result;
      }

      // Sort achievements by earned date (newest first) and then by type
      const sortedAchievements = result.data.sort((a, b) => {
        if (a.earnedAt && b.earnedAt) {
          return b.earnedAt.getTime() - a.earnedAt.getTime();
        }
        return a.type.localeCompare(b.type);
      });

      return {
        success: true,
        data: sortedAchievements
      };
    } catch (error) {
      console.error('GetAllAchievementsUseCase error:', error);
      return {
        success: false,
        error: `Failed to retrieve achievements: ${error}`
      };
    }
  }
}