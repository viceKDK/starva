import { Result } from '@/shared/types';
import { IRunRepository } from '@/domain/repositories/IRunRepository';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import { AchievementProgressService, AchievementProgressItem } from '@/application/services/AchievementProgressService';

export class GetAchievementsProgressUseCase {
  constructor(
    private runRepository: IRunRepository,
    private achievementRepository: IAchievementRepository
  ) {}

  async execute(): Promise<Result<AchievementProgressItem[], string>> {
    const svc = new AchievementProgressService(this.runRepository, this.achievementRepository);
    return svc.getProgress();
  }
}

