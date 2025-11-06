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
    const startTime = Date.now();

    try {
      const newAchievements: Achievement[] = [];

      // Performance optimization: Load all data once instead of multiple queries
      const [allRunsResult, existingAchievementsResult] = await Promise.all([
        this.runRepository.findAll(),
        this.achievementRepository.findAll()
      ]);

      if (!allRunsResult.success) {
        return { success: false, error: 'Failed to load runs for achievement detection' };
      }

      if (!existingAchievementsResult.success) {
        return { success: false, error: 'Failed to load existing achievements' };
      }

      const allRuns = allRunsResult.data;
      const existingAchievements = existingAchievementsResult.data;

      // Check all achievement types with cached data
      const distanceAchievements = await this.checkDistanceMilestones(run, existingAchievements);
      const volumeAchievements = await this.checkVolumeAchievements(run, allRuns, existingAchievements);
      const frequencyAchievements = await this.checkFrequencyAchievements(run, allRuns, existingAchievements);
      const speedAchievements = await this.checkSpeedAchievements(run, existingAchievements);
      const consistencyAchievements = await this.checkConsistencyAchievements(run, allRuns, existingAchievements);

      newAchievements.push(...distanceAchievements);
      newAchievements.push(...volumeAchievements);
      newAchievements.push(...frequencyAchievements);
      newAchievements.push(...speedAchievements);
      newAchievements.push(...consistencyAchievements);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Log performance for monitoring
      if (executionTime > 1000) {
        console.warn(`Achievement detection took ${executionTime}ms - exceeds target of 1s`);
      }

      return { success: true, data: newAchievements };
    } catch (error) {
      console.error('Error detecting achievements:', error);
      return { success: false, error: `Failed to detect achievements: ${error}` };
    }
  }

  private checkDistanceMilestones(run: Run, existingAchievements: Achievement[]): Achievement[] {
    const achievements: Achievement[] = [];
    const distanceKm = run.distance / 1000;
    const milestones = [5, 10, 21.1, 42.2];

    for (const milestone of milestones) {
      if (distanceKm >= milestone) {
        // Check if this milestone achievement already exists in cached data
        const hasExisting = existingAchievements.some(
          achievement => achievement.type === 'DISTANCE_MILESTONE' &&
                        achievement.criteria?.distance === milestone
        );

        if (!hasExisting) {
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

  private checkVolumeAchievements(run: Run, allRuns: Run[], existingAchievements: Achievement[]): Achievement[] {
    const achievements: Achievement[] = [];

    const totalDistanceKm = allRuns.reduce(
      (sum, r) => sum + (r.distance / 1000),
      0
    );

    const volumeMilestones = [50, 100, 500, 1000];

    for (const milestone of volumeMilestones) {
      if (totalDistanceKm >= milestone) {
        // Check if this volume achievement already exists in cached data
        const hasExisting = existingAchievements.some(
          achievement => achievement.type === 'VOLUME' &&
                        achievement.criteria?.totalDistance === milestone
        );

        if (!hasExisting) {
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

  private checkFrequencyAchievements(run: Run, allRuns: Run[], existingAchievements: Achievement[]): Achievement[] {
    const achievements: Achievement[] = [];

    const totalRuns = allRuns.length;
    const frequencyMilestones = [10, 25, 50, 100];

    for (const milestone of frequencyMilestones) {
      if (totalRuns >= milestone) {
        // Check if this frequency achievement already exists in cached data
        const hasExisting = existingAchievements.some(
          achievement => achievement.type === 'FREQUENCY' &&
                        achievement.criteria?.totalRuns === milestone
        );

        if (!hasExisting) {
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

  private checkSpeedAchievements(run: Run, existingAchievements: Achievement[]): Achievement[] {
    const achievements: Achievement[] = [];
    const distanceKm = run.distance / 1000;

    // Only check speed achievements for runs of at least 1K
    if (distanceKm < 1) {
      return achievements;
    }

    const paceThresholds = [360, 300, 240]; // 6:00, 5:00, 4:00 per km in seconds

    for (const threshold of paceThresholds) {
      if (run.averagePace <= threshold) {
        // Check if this speed achievement already exists in cached data
        const hasExisting = existingAchievements.some(
          achievement => achievement.type === 'SPEED' &&
                        achievement.criteria?.pace === threshold
        );

        if (!hasExisting) {
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

  private checkConsistencyAchievements(run: Run, allRuns: Run[], existingAchievements: Achievement[]): Achievement[] {
    const achievements: Achievement[] = [];

    // Sort runs by date
    const sortedRuns = allRuns.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Calculate consecutive days streak ending today
    const streak = this.calculateConsecutiveStreak(sortedRuns);
    const consistencyMilestones = [3, 7, 30];

    for (const milestone of consistencyMilestones) {
      if (streak >= milestone) {
        // Check if this consistency achievement already exists in cached data
        const hasExisting = existingAchievements.some(
          achievement => achievement.type === 'CONSISTENCY' &&
                        achievement.criteria?.consecutiveDays === milestone
        );

        if (!hasExisting) {
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
    if (achievements.length === 0) {
      return { success: true, data: undefined };
    }

    const startTime = Date.now();

    try {
      // Check if repository supports batch operations
      if (this.achievementRepository.saveMany) {
        // Use batch save for better performance
        const saveResult = await this.achievementRepository.saveMany(achievements);
        if (!saveResult.success) {
          console.error('Failed to batch save achievements:', saveResult.error);
          return saveResult;
        }
      } else {
        // Fallback to sequential saves
        for (const achievement of achievements) {
          const saveResult = await this.achievementRepository.save(achievement);
          if (!saveResult.success) {
            console.error(`Failed to save achievement ${achievement.title}:`, saveResult.error);
            return saveResult;
          }
        }
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`Saved ${achievements.length} new achievements in ${executionTime}ms`);

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error saving achievements:', error);
      return { success: false, error: `Failed to save achievements: ${error}` };
    }
  }

  /**
   * Performance monitoring helper
   */
  async getPerformanceMetrics(): Promise<{
    totalAchievements: number;
    totalRuns: number;
    lastDetectionTime?: number;
  }> {
    try {
      const [achievementsResult, runsResult] = await Promise.all([
        this.achievementRepository.findAll(),
        this.runRepository.findAll()
      ]);

      return {
        totalAchievements: achievementsResult.success ? achievementsResult.data.length : 0,
        totalRuns: runsResult.success ? runsResult.data.length : 0
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        totalAchievements: 0,
        totalRuns: 0
      };
    }
  }
}