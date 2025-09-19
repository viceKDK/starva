import { Run } from '@/domain/entities';
import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { Result } from '@/shared/types';

export interface RunStatistics {
  totalRuns: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  averageDistance: number; // meters
  averageDuration: number; // seconds
  averagePace: number; // seconds per km
  longestRun: number; // meters
  fastestPace: number; // seconds per km
  thisWeekStats: {
    runs: number;
    distance: number;
    duration: number;
  };
  thisMonthStats: {
    runs: number;
    distance: number;
    duration: number;
  };
  personalRecords: {
    longestDistance: Run | null;
    fastestPace: Run | null;
    longestDuration: Run | null;
  };
}

export class GetRunStatisticsUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(): Promise<Result<RunStatistics, DatabaseError>> {
    try {
      const runsResult = await this.runRepository.findAll();

      if (!runsResult.success) {
        return { success: false, error: runsResult.error! };
      }

      const runs = runsResult.data || [];

      if (runs.length === 0) {
        return {
          success: true,
          data: this.getEmptyStatistics()
        };
      }

      const statistics = this.calculateStatistics(runs);
      return { success: true, data: statistics };
    } catch (error) {
      console.error('GetRunStatisticsUseCase error:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }

  private calculateStatistics(runs: Run[]): RunStatistics {
    const now = new Date();
    const weekStart = this.getWeekStart(now);
    const monthStart = this.getMonthStart(now);

    // Calculate totals
    const totalDistance = runs.reduce((sum, run) => sum + run.distance, 0);
    const totalDuration = runs.reduce((sum, run) => sum + run.duration, 0);

    // Calculate averages
    const averageDistance = totalDistance / runs.length;
    const averageDuration = totalDuration / runs.length;
    const averagePace = totalDistance > 0 ? (totalDuration / (totalDistance / 1000)) : 0;

    // Find records
    const longestRun = Math.max(...runs.map(run => run.distance));
    const fastestPace = Math.min(...runs.filter(run => run.averagePace > 0).map(run => run.averagePace));

    // Calculate weekly stats
    const thisWeekRuns = runs.filter(run => run.startTime >= weekStart);
    const thisWeekStats = {
      runs: thisWeekRuns.length,
      distance: thisWeekRuns.reduce((sum, run) => sum + run.distance, 0),
      duration: thisWeekRuns.reduce((sum, run) => sum + run.duration, 0)
    };

    // Calculate monthly stats
    const thisMonthRuns = runs.filter(run => run.startTime >= monthStart);
    const thisMonthStats = {
      runs: thisMonthRuns.length,
      distance: thisMonthRuns.reduce((sum, run) => sum + run.distance, 0),
      duration: thisMonthRuns.reduce((sum, run) => sum + run.duration, 0)
    };

    // Find personal record runs
    const longestDistanceRun = runs.find(run => run.distance === longestRun) || null;
    const fastestPaceRun = runs.find(run => run.averagePace === fastestPace) || null;
    const longestDurationRun = runs.reduce((longest, run) =>
      run.duration > (longest?.duration || 0) ? run : longest, runs[0] || null
    );

    return {
      totalRuns: runs.length,
      totalDistance,
      totalDuration,
      averageDistance,
      averageDuration,
      averagePace,
      longestRun,
      fastestPace,
      thisWeekStats,
      thisMonthStats,
      personalRecords: {
        longestDistance: longestDistanceRun,
        fastestPace: fastestPaceRun,
        longestDuration: longestDurationRun
      }
    };
  }

  private getEmptyStatistics(): RunStatistics {
    return {
      totalRuns: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageDistance: 0,
      averageDuration: 0,
      averagePace: 0,
      longestRun: 0,
      fastestPace: 0,
      thisWeekStats: { runs: 0, distance: 0, duration: 0 },
      thisMonthStats: { runs: 0, distance: 0, duration: 0 },
      personalRecords: {
        longestDistance: null,
        fastestPace: null,
        longestDuration: null
      }
    };
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private getMonthStart(date: Date): Date {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    return monthStart;
  }
}