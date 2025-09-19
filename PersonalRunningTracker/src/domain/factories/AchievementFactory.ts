import { Achievement, AchievementId, AchievementType } from '@/domain/entities/Achievement';
import { Run, RunId } from '@/domain/entities';

export interface CreateAchievementOptions {
  type: AchievementType;
  title: string;
  description: string;
  value: number;
  runId: RunId;
  achievedAt?: Date;
}

export interface AchievementTemplate {
  type: AchievementType;
  title: string;
  description: string;
  targetValue: number;
  checkCondition: (run: Run, allRuns: Run[]) => boolean;
}

export class AchievementFactory {
  static create(options: CreateAchievementOptions): Achievement {
    const { type, title, description, value, runId, achievedAt } = options;

    return new Achievement(
      AchievementId.generate(),
      type,
      title,
      description,
      value,
      runId,
      achievedAt || new Date()
    );
  }

  static createDistanceMilestone(distance: number, runId: RunId): Achievement {
    const kmDistance = Math.round(distance / 1000);

    return this.create({
      type: 'distance',
      title: `${kmDistance}K Milestone`,
      description: `Completed your first ${kmDistance} kilometer run!`,
      value: distance,
      runId
    });
  }

  static createConsistencyAchievement(consecutiveDays: number, runId: RunId): Achievement {
    return this.create({
      type: 'consistency',
      title: `${consecutiveDays} Day Streak`,
      description: `Ran for ${consecutiveDays} consecutive days. Keep it up!`,
      value: consecutiveDays,
      runId
    });
  }

  static createVolumeAchievement(totalKm: number, period: string, runId: RunId): Achievement {
    return this.create({
      type: 'volume',
      title: `${totalKm}K ${period}`,
      description: `Completed ${totalKm} kilometers in a ${period.toLowerCase()}!`,
      value: totalKm,
      runId
    });
  }

  static createFrequencyAchievement(runsCount: number, period: string, runId: RunId): Achievement {
    return this.create({
      type: 'frequency',
      title: `${runsCount} Runs`,
      description: `Completed ${runsCount} runs in a ${period.toLowerCase()}!`,
      value: runsCount,
      runId
    });
  }

  static createSpeedAchievement(pace: number, distance: string, runId: RunId): Achievement {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    const paceStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return this.create({
      type: 'speed',
      title: `${paceStr}/km ${distance}`,
      description: `Achieved a ${paceStr}/km average pace for ${distance}!`,
      value: pace,
      runId
    });
  }

  static getAchievementTemplates(): AchievementTemplate[] {
    return [
      // Distance Milestones
      {
        type: 'distance',
        title: 'First 1K',
        description: 'Completed your first kilometer!',
        targetValue: 1000,
        checkCondition: (run) => run.distance >= 1000
      },
      {
        type: 'distance',
        title: 'First 5K',
        description: 'Completed your first 5 kilometer run!',
        targetValue: 5000,
        checkCondition: (run) => run.distance >= 5000
      },
      {
        type: 'distance',
        title: 'First 10K',
        description: 'Completed your first 10 kilometer run!',
        targetValue: 10000,
        checkCondition: (run) => run.distance >= 10000
      },
      {
        type: 'distance',
        title: 'Half Marathon',
        description: 'Completed your first half marathon (21.1K)!',
        targetValue: 21100,
        checkCondition: (run) => run.distance >= 21100
      },
      {
        type: 'distance',
        title: 'Marathon',
        description: 'Completed your first marathon (42.2K)!',
        targetValue: 42200,
        checkCondition: (run) => run.distance >= 42200
      },

      // Consistency Achievements
      {
        type: 'consistency',
        title: '3 Day Streak',
        description: 'Ran for 3 consecutive days!',
        targetValue: 3,
        checkCondition: (run, allRuns) => this.checkConsistencyStreak(run, allRuns, 3)
      },
      {
        type: 'consistency',
        title: 'Week Warrior',
        description: 'Ran for 7 consecutive days!',
        targetValue: 7,
        checkCondition: (run, allRuns) => this.checkConsistencyStreak(run, allRuns, 7)
      },
      {
        type: 'consistency',
        title: 'Two Week Champion',
        description: 'Ran for 14 consecutive days!',
        targetValue: 14,
        checkCondition: (run, allRuns) => this.checkConsistencyStreak(run, allRuns, 14)
      },

      // Volume Achievements
      {
        type: 'volume',
        title: '50K Month',
        description: 'Completed 50 kilometers in a month!',
        targetValue: 50,
        checkCondition: (run, allRuns) => this.checkMonthlyVolume(run, allRuns, 50000)
      },
      {
        type: 'volume',
        title: '100K Month',
        description: 'Completed 100 kilometers in a month!',
        targetValue: 100,
        checkCondition: (run, allRuns) => this.checkMonthlyVolume(run, allRuns, 100000)
      },

      // Frequency Achievements
      {
        type: 'frequency',
        title: '10 Runs',
        description: 'Completed 10 total runs!',
        targetValue: 10,
        checkCondition: (run, allRuns) => allRuns.length >= 10
      },
      {
        type: 'frequency',
        title: '25 Runs',
        description: 'Completed 25 total runs!',
        targetValue: 25,
        checkCondition: (run, allRuns) => allRuns.length >= 25
      },
      {
        type: 'frequency',
        title: '50 Runs',
        description: 'Completed 50 total runs!',
        targetValue: 50,
        checkCondition: (run, allRuns) => allRuns.length >= 50
      },

      // Speed Achievements
      {
        type: 'speed',
        title: 'Sub-5 5K',
        description: 'Completed a 5K with sub-5:00/km pace!',
        targetValue: 300, // 5:00 min/km
        checkCondition: (run) => run.distance >= 5000 && run.averagePace < 300
      },
      {
        type: 'speed',
        title: 'Sub-4 5K',
        description: 'Completed a 5K with sub-4:00/km pace!',
        targetValue: 240, // 4:00 min/km
        checkCondition: (run) => run.distance >= 5000 && run.averagePace < 240
      }
    ];
  }

  static detectAchievements(run: Run, allRuns: Run[], existingAchievements: Achievement[]): Achievement[] {
    const templates = this.getAchievementTemplates();
    const newAchievements: Achievement[] = [];

    // Get existing achievement types to avoid duplicates
    const existingTypes = new Set(
      existingAchievements.map(achievement =>
        `${achievement.type}-${achievement.value}`
      )
    );

    for (const template of templates) {
      const achievementKey = `${template.type}-${template.targetValue}`;

      // Skip if already achieved
      if (existingTypes.has(achievementKey)) {
        continue;
      }

      // Check if conditions are met
      if (template.checkCondition(run, allRuns)) {
        const achievement = this.create({
          type: template.type,
          title: template.title,
          description: template.description,
          value: template.targetValue,
          runId: run.id,
          achievedAt: run.endTime
        });

        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  private static checkConsistencyStreak(run: Run, allRuns: Run[], targetDays: number): boolean {
    const sortedRuns = [...allRuns].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    let streak = 1; // Current run counts as 1
    let lastRunDate = new Date(run.startTime);
    lastRunDate.setHours(0, 0, 0, 0);

    for (const pastRun of sortedRuns) {
      if (pastRun.id.value === run.id.value) continue;

      const pastRunDate = new Date(pastRun.startTime);
      pastRunDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((lastRunDate.getTime() - pastRunDate.getTime()) / (24 * 60 * 60 * 1000));

      if (daysDiff === 1) {
        streak++;
        lastRunDate = pastRunDate;

        if (streak >= targetDays) {
          return true;
        }
      } else if (daysDiff > 1) {
        break; // Streak broken
      }
    }

    return streak >= targetDays;
  }

  private static checkMonthlyVolume(run: Run, allRuns: Run[], targetMeters: number): boolean {
    const runMonth = new Date(run.startTime.getFullYear(), run.startTime.getMonth(), 1);
    const nextMonth = new Date(runMonth.getFullYear(), runMonth.getMonth() + 1, 1);

    const monthlyRuns = allRuns.filter(r =>
      r.startTime >= runMonth && r.startTime < nextMonth
    );

    const totalDistance = monthlyRuns.reduce((sum, r) => sum + r.distance, 0);
    return totalDistance >= targetMeters;
  }

  static createMockAchievement(overrides?: Partial<CreateAchievementOptions>): Achievement {
    const defaultOptions: CreateAchievementOptions = {
      type: 'distance',
      title: 'First 5K',
      description: 'Completed your first 5 kilometer run!',
      value: 5000,
      runId: RunId.generate(),
      achievedAt: new Date(),
      ...overrides
    };

    return this.create(defaultOptions);
  }

  static createMockAchievements(count: number = 5): Achievement[] {
    const templates = this.getAchievementTemplates().slice(0, count);

    return templates.map((template, index) => this.createMockAchievement({
      type: template.type,
      title: template.title,
      description: template.description,
      value: template.targetValue,
      achievedAt: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000) // i weeks ago
    }));
  }
}