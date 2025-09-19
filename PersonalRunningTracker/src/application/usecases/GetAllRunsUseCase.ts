import { Run } from '@/domain/entities';
import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { Result } from '@/shared/types';

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'distance-desc'
  | 'distance-asc'
  | 'duration-desc'
  | 'duration-asc'
  | 'pace-desc'
  | 'pace-asc';

export interface GetAllRunsOptions {
  sortBy?: SortOption;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  distanceRange?: {
    minDistance: number; // meters
    maxDistance: number; // meters
  };
}

export class GetAllRunsUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(options: GetAllRunsOptions = {}): Promise<Result<Run[], DatabaseError>> {
    try {
      // Get all runs from repository
      const runsResult = await this.runRepository.findAll();

      if (!runsResult.success) {
        return { success: false, error: runsResult.error! };
      }

      let runs = runsResult.data || [];

      // Apply search filter
      if (options.searchQuery) {
        runs = this.filterBySearch(runs, options.searchQuery);
      }

      // Apply date range filter
      if (options.dateRange) {
        runs = this.filterByDateRange(runs, options.dateRange);
      }

      // Apply distance range filter
      if (options.distanceRange) {
        runs = this.filterByDistanceRange(runs, options.distanceRange);
      }

      // Apply sorting
      runs = this.sortRuns(runs, options.sortBy || 'date-desc');

      // Apply pagination
      if (options.offset !== undefined || options.limit !== undefined) {
        const offset = options.offset || 0;
        const limit = options.limit || runs.length;
        runs = runs.slice(offset, offset + limit);
      }

      return { success: true, data: runs };
    } catch (error) {
      console.error('GetAllRunsUseCase error:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }

  private filterBySearch(runs: Run[], searchQuery: string): Run[] {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return runs;

    return runs.filter(run =>
      run.name.toLowerCase().includes(query) ||
      run.notes.toLowerCase().includes(query)
    );
  }

  private filterByDateRange(runs: Run[], dateRange: { startDate: Date; endDate: Date }): Run[] {
    return runs.filter(run =>
      run.startTime >= dateRange.startDate &&
      run.startTime <= dateRange.endDate
    );
  }

  private filterByDistanceRange(runs: Run[], distanceRange: { minDistance: number; maxDistance: number }): Run[] {
    return runs.filter(run =>
      run.distance >= distanceRange.minDistance &&
      run.distance <= distanceRange.maxDistance
    );
  }

  private sortRuns(runs: Run[], sortBy: SortOption): Run[] {
    return [...runs].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.startTime.getTime() - a.startTime.getTime();
        case 'date-asc':
          return a.startTime.getTime() - b.startTime.getTime();
        case 'distance-desc':
          return b.distance - a.distance;
        case 'distance-asc':
          return a.distance - b.distance;
        case 'duration-desc':
          return b.duration - a.duration;
        case 'duration-asc':
          return a.duration - b.duration;
        case 'pace-desc':
          return b.averagePace - a.averagePace; // Slower pace first
        case 'pace-asc':
          return a.averagePace - b.averagePace; // Faster pace first
        default:
          return 0;
      }
    });
  }
}