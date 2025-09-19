import { Achievement, AchievementType } from '@/domain/entities/Achievement';
import { Run } from '@/domain/entities/Run';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import { IRunRepository } from '@/domain/repositories/IRunRepository';
import { Result } from '@/shared/types';

export class AchievementDetectionService {
  constructor(
    private achievementRepository: IAchievementRepository,
    private runRepository: IRunRepository
  ) {}

  async detectNewAchievements(run: Run): Promise<Result<Achievement[], string>> {
    try {
      const newAchievements: Achievement[] = [];

      // Check all achievement types
      const distanceAchievements = await this.checkDistanceMilestones(run);
      const volumeAchievements = await this.checkVolumeAchievements(run);
      const frequencyAchievements = await this.checkFrequencyAchievements(run);
      const speedAchievements = await this.checkSpeedAchievements(run);
      const consistencyAchievements = await this.checkConsistencyAchievements(run);

      newAchievements.push(...distanceAchievements);
      newAchievements.push(...volumeAchievements);
      newAchievements.push(...frequencyAchievements);
      newAchievements.push(...speedAchievements);
      newAchievements.push(...consistencyAchievements);

      return { success: true, data: newAchievements };
    } catch (error) {
      console.error('Error detecting achievements:', error);
      return { success: false, error: `Failed to detect achievements: ${error}` };
    }
  }

  private async checkDistanceMilestones(run: Run): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const distanceKm = run.distance / 1000;
    const milestones = [5, 10, 21.1, 42.2];

    for (const milestone of milestones) {
      if (distanceKm >= milestone) {
        // Check if this milestone achievement already exists
        const existingResult = await this.achievementRepository.findByTypeAndCriteria(
          'DISTANCE_MILESTONE',
          { distance: milestone }
        );

        if (existingResult.success && !existingResult.data) {
          const achievement = Achievement.createDistanceMilestone(
            milestone,
            { value: run.id }
          );
          achievements.push(achievement);
        }
      }
    }

    return achievements;
  }

  private async checkVolumeAchievements(run: Run): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const allRunsResult = await this.runRepository.findAll();

    if (!allRunsResult.success) {
      return achievements;
    }

    const totalDistanceKm = allRunsResult.data.reduce(
      (sum, r) => sum + (r.distance / 1000),
      0
    );

    const volumeMilestones = [50, 100, 500, 1000];

    for (const milestone of volumeMilestones) {
      if (totalDistanceKm >= milestone) {
        // Check if this volume achievement already exists
        const existingResult = await this.achievementRepository.findByTypeAndCriteria(
          'VOLUME',
          { totalDistance: milestone }
        );

        if (existingResult.success && !existingResult.data) {
          const achievement = Achievement.createVolumeAchievement(
            milestone,
            { value: run.id }
          );
          achievements.push(achievement);
        }
      }
    }

    return achievements;
  }

  private async checkFrequencyAchievements(run: Run): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const allRunsResult = await this.runRepository.findAll();

    if (!allRunsResult.success) {
      return achievements;
    }

    const totalRuns = allRunsResult.data.length;
    const frequencyMilestones = [10, 25, 50, 100];

    for (const milestone of frequencyMilestones) {
      if (totalRuns >= milestone) {
        // Check if this frequency achievement already exists
        const existingResult = await this.achievementRepository.findByTypeAndCriteria(
          'FREQUENCY',
          { totalRuns: milestone }
        );

        if (existingResult.success && !existingResult.data) {
          const achievement = Achievement.createFrequencyAchievement(
            milestone,
            { value: run.id }
          );
          achievements.push(achievement);
        }
      }
    }

    return achievements;
  }

  private async checkSpeedAchievements(run: Run): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const distanceKm = run.distance / 1000;

    // Only check speed achievements for runs of at least 1K
    if (distanceKm < 1) {
      return achievements;
    }

    const paceThresholds = [360, 300, 240]; // 6:00, 5:00, 4:00 per km in seconds

    for (const threshold of paceThresholds) {
      if (run.averagePace <= threshold) {
        // Check if this speed achievement already exists
        const existingResult = await this.achievementRepository.findByTypeAndCriteria(
          'SPEED',
          { pace: threshold }
        );

        if (existingResult.success && !existingResult.data) {
          const achievement = Achievement.createSpeedAchievement(
            threshold,
            { value: run.id }
          );
          achievements.push(achievement);
        }
      }
    }

    return achievements;
  }

  private async checkConsistencyAchievements(run: Run): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const allRunsResult = await this.runRepository.findAll();

    if (!allRunsResult.success) {
      return achievements;
    }

    // Sort runs by date
    const sortedRuns = allRunsResult.data.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Calculate consecutive days streak ending today
    const streak = this.calculateConsecutiveStreak(sortedRuns);
    const consistencyMilestones = [3, 7, 30];

    for (const milestone of consistencyMilestones) {
      if (streak >= milestone) {
        // Check if this consistency achievement already exists
        const existingResult = await this.achievementRepository.findByTypeAndCriteria(
          'CONSISTENCY',
          { consecutiveDays: milestone }
        );

        if (existingResult.success && !existingResult.data) {
          const achievement = Achievement.createConsistencyAchievement(
            milestone,
            { value: run.id }
          );
          achievements.push(achievement);
        }
      }
    }

    return achievements;
  }

  private calculateConsecutiveStreak(sortedRuns: Run[]): number {
    if (sortedRuns.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group runs by date
    const runsByDate = new Map<string, Run[]>();

    for (const run of sortedRuns) {
      const runDate = new Date(run.startTime);
      runDate.setHours(0, 0, 0, 0);
      const dateKey = runDate.toISOString().split('T')[0];

      if (!runsByDate.has(dateKey)) {
        runsByDate.set(dateKey, []);
      }
      runsByDate.get(dateKey)!.push(run);
    }

    // Calculate consecutive days from today backwards
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateKey = currentDate.toISOString().split('T')[0];

      if (runsByDate.has(dateKey)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }

      // Prevent infinite loop - max reasonable streak
      if (streak > 365) break;
    }

    return streak;
  }

  async saveNewAchievements(achievements: Achievement[]): Promise<Result<void, string>> {
    try {
      for (const achievement of achievements) {
        const saveResult = await this.achievementRepository.save(achievement);
        if (!saveResult.success) {
          console.error(`Failed to save achievement ${achievement.title}:`, saveResult.error);
          return saveResult;
        }
      }
      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error saving achievements:', error);
      return { success: false, error: `Failed to save achievements: ${error}` };
    }
  }
}