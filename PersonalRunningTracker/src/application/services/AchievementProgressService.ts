import { IRunRepository } from '@/domain/repositories/IRunRepository';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import { Result } from '@/shared/types';

export interface AchievementProgressItem {
  key: string;
  title: string;
  detail: string;
  progress: number; // 0..1
  current: number;
  target: number;
  unit: string; // e.g., 'K', 'runs', 'days'
}

export class AchievementProgressService {
  constructor(
    private runRepository: IRunRepository,
    private achievementRepository: IAchievementRepository
  ) {}

  async getProgress(): Promise<Result<AchievementProgressItem[], string>> {
    try {
      const runsRes = await this.runRepository.findAll();
      if (!runsRes.success) return { success: false, error: 'Failed to load runs' };

      const earnedRes = await this.achievementRepository.findEarnedAchievements();
      if (!earnedRes.success) return { success: false, error: 'Failed to load achievements' };

      const runs = runsRes.data;
      const achievements = earnedRes.data;

      const totalDistanceK = runs.reduce((sum, r) => sum + r.distance / 1000, 0);
      const totalRuns = runs.length;
      const maxDistanceK = runs.reduce((m, r) => Math.max(m, r.distance / 1000), 0);
      const currentStreak = this.calculateConsecutiveStreak(runs.map(r => r.startTime));

      const volumeMilestones = [50, 100, 500, 1000];
      const nextVolume = this.nextMilestone(volumeMilestones, totalDistanceK);

      const frequencyMilestones = [10, 50, 100];
      const nextFrequency = this.nextMilestone(frequencyMilestones, totalRuns);

      const distanceMilestones = [5, 10, 21.1, 42.2];
      const nextDistance = this.nextMilestone(distanceMilestones, maxDistanceK);

      const consistencyMilestones = [3, 7, 30];
      const nextConsistency = this.nextMilestone(consistencyMilestones, currentStreak);

      const items: AchievementProgressItem[] = [];

      if (nextVolume) {
        items.push({
          key: 'VOLUME_NEXT',
          title: `${nextVolume.target}K Total Distance`,
          detail: `Next milestone: ${nextVolume.target}K` ,
          progress: Math.min(totalDistanceK / nextVolume.target, 1),
          current: Math.round(totalDistanceK),
          target: nextVolume.target,
          unit: 'K'
        });
      }

      if (nextFrequency) {
        items.push({
          key: 'FREQUENCY_NEXT',
          title: `${nextFrequency.target} Total Runs`,
          detail: `Next milestone: ${nextFrequency.target} runs`,
          progress: Math.min(totalRuns / nextFrequency.target, 1),
          current: totalRuns,
          target: nextFrequency.target,
          unit: 'runs'
        });
      }

      if (nextDistance) {
        items.push({
          key: 'DISTANCE_NEXT',
          title: `First ${nextDistance.target}K Completion`,
          detail: `Longest so far: ${maxDistanceK.toFixed(1)}K`,
          progress: Math.min(maxDistanceK / nextDistance.target, 1),
          current: Math.round(maxDistanceK * 10) / 10,
          target: nextDistance.target,
          unit: 'K'
        });
      }

      if (nextConsistency) {
        const daysRemaining = Math.max(nextConsistency.target - currentStreak, 0);
        items.push({
          key: 'CONSISTENCY_NEXT',
          title: `${nextConsistency.target}-Day Streak`,
          detail: daysRemaining > 0 ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to go` : 'On target!',
          progress: Math.min(currentStreak / nextConsistency.target, 1),
          current: currentStreak,
          target: nextConsistency.target,
          unit: 'days'
        });
      }

      return { success: true, data: items };
    } catch (e) {
      console.error('AchievementProgressService error', e);
      return { success: false, error: 'Failed to compute progress' };
    }
  }

  private nextMilestone(milestones: number[], current: number): { target: number } | null {
    const sorted = [...milestones].sort((a, b) => a - b);
    for (const m of sorted) {
      if (current < m) return { target: m };
    }
    return { target: sorted[sorted.length - 1] };
  }

  private calculateConsecutiveStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byDay = new Set(
      dates.map(d => {
        const dt = new Date(d);
        dt.setHours(0, 0, 0, 0);
        return dt.toISOString().split('T')[0];
      })
    );

    let streak = 0;
    const cur = new Date(today);
    while (true) {
      const key = cur.toISOString().split('T')[0];
      if (byDay.has(key)) {
        streak++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
      if (streak > 365) break;
    }
    return streak;
  }
}

