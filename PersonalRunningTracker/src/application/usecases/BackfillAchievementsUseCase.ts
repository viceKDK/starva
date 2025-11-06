import { Result } from '@/shared/types';
import { IRunRepository } from '@/domain/repositories/IRunRepository';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import { Achievement } from '@/domain/entities/Achievement';
import { AchievementDetectionService } from '@/application/services/AchievementDetectionService';

export class BackfillAchievementsUseCase {
  constructor(
    private runRepository: IRunRepository,
    private achievementRepository: IAchievementRepository
  ) {}

  async execute(): Promise<Result<Achievement[], string>> {
    try {
      const runsRes = await this.runRepository.findAll();
      if (!runsRes.success) return { success: false, error: 'Failed to load runs for backfill' };

      const runs = [...runsRes.data].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const service = new AchievementDetectionService(this.achievementRepository, this.runRepository);

      const accumulated: Achievement[] = [];
      for (const run of runs) {
        const detectRes = await service.detectNewAchievements(run);
        if (!detectRes.success) {
          console.error('Backfill achievements detect failed:', detectRes.error);
          continue;
        }
        const newOnes = detectRes.data;
        if (newOnes.length > 0) {
          const saveRes = await service.saveNewAchievements(newOnes);
          if (!saveRes.success) {
            console.error('Backfill achievements save failed:', saveRes.error);
          }
          accumulated.push(...newOnes);
        }
      }

      return { success: true, data: accumulated };
    } catch (e) {
      console.error('BackfillAchievementsUseCase error', e);
      return { success: false, error: 'Failed to backfill achievements' };
    }
  }
}

