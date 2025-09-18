# Story 2.2: Run History Display and Management

**Epic**: Core Run Tracking Features
**Story ID**: 2.2
**Priority**: Must Have
**Estimated Effort**: 6-8 hours

## User Story

As a user,
I want to view my complete run history with sorting and filtering options,
so that I can track my progress and find specific runs easily.

## Acceptance Criteria

### 1. History Screen Layout
- [ ] Run history accessible from bottom tab navigation
- [ ] List view shows runs in reverse chronological order (newest first)
- [ ] Each run item displays: date, distance, duration, pace, and name
- [ ] Clean, scannable design with consistent spacing and typography
- [ ] Empty state message for new users with no run history

### 2. Run List Item Design
- [ ] Run date displayed prominently (e.g., "Today", "Yesterday", "Oct 15")
- [ ] Run name shown as secondary information
- [ ] Key metrics (distance, duration, pace) displayed clearly
- [ ] Visual hierarchy guides eye to most important information
- [ ] Tap interaction provides visual feedback

### 3. Sorting and Filtering
- [ ] Sort options: Date (newest/oldest), Distance, Duration, Pace
- [ ] Filter by date range (last week, month, year, custom)
- [ ] Filter by distance range (short/medium/long runs)
- [ ] Search functionality for run names and notes
- [ ] Sort and filter preferences persist between sessions

### 4. Performance with Large Datasets
- [ ] Lazy loading for runs list (load 20 items initially)
- [ ] Infinite scroll or pagination for efficient memory usage
- [ ] Database queries optimized with proper indexing
- [ ] Smooth scrolling performance with 1000+ runs
- [ ] Loading indicators during data fetch operations

### 5. Run Details Navigation
- [ ] Tap on run item navigates to detailed run view
- [ ] Swipe gestures for quick actions (delete, duplicate)
- [ ] Long press shows context menu with additional options
- [ ] Return navigation maintains scroll position in list

### 6. Data Management
- [ ] Pull-to-refresh updates run list from database
- [ ] Run deletion with confirmation dialog
- [ ] Bulk selection mode for multiple run management
- [ ] Data export options (prepare for future GPX export)

### 7. Statistics Summary
- [ ] Header section shows overall statistics
- [ ] Total runs count, total distance, total time
- [ ] Current week/month statistics
- [ ] Personal records highlighted (longest run, fastest pace)
- [ ] Statistics update automatically with new runs

### 8. Error Handling and Edge Cases
- [ ] Database connection errors handled gracefully
- [ ] Corrupted run data filtered out of display
- [ ] Network independence maintained
- [ ] Large dataset loading timeout handling

## Implementation Details

### History Screen Structure
```typescript
// src/presentation/screens/RunHistoryScreen.tsx
export const RunHistoryScreen: React.FC = () => {
  const controller = useRunHistoryController();

  return (
    <RunHistoryScreenView
      runs={controller.runs}
      statistics={controller.statistics}
      isLoading={controller.isLoading}
      sortOption={controller.sortOption}
      onSort={controller.setSortOption}
      onFilter={controller.setFilter}
      onRefresh={controller.refresh}
      onRunTap={controller.navigateToDetails}
    />
  );
};
```

### History Controller Logic
```typescript
// src/presentation/controllers/RunHistoryController.ts
export const useRunHistoryController = () => {
  const getAllRunsUseCase = useGetAllRunsUseCase();
  const [runs, setRuns] = useState<Run[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  useEffect(() => {
    loadRuns();
  }, [sortOption]);

  const loadRuns = async () => {
    const result = await getAllRunsUseCase.execute(sortOption);
    if (result.isOk()) {
      setRuns(result.value);
    }
  };
};
```

### Statistics Calculation
```typescript
// src/application/usecases/GetRunStatisticsUseCase.ts
export class GetRunStatisticsUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(): Promise<Result<RunStatistics, RepositoryError>> {
    const runsResult = await this.runRepository.findAll();
    if (runsResult.isErr()) return runsResult;

    const stats = this.calculateStatistics(runsResult.value);
    return Ok(stats);
  }

  private calculateStatistics(runs: Run[]): RunStatistics {
    return {
      totalRuns: runs.length,
      totalDistance: runs.reduce((sum, run) => sum + run.distance.value, 0),
      totalDuration: runs.reduce((sum, run) => sum + run.duration.seconds, 0),
      longestRun: Math.max(...runs.map(run => run.distance.value)),
      fastestPace: Math.min(...runs.map(run => run.averagePace.secondsPerKm))
    };
  }
}
```

## Definition of Done

- [ ] Run history displays all saved runs correctly
- [ ] Sorting and filtering work as expected
- [ ] Performance acceptable with large datasets (1000+ runs)
- [ ] Statistics section shows accurate calculations
- [ ] Navigation to run details functions properly
- [ ] Delete functionality works with proper confirmations
- [ ] Loading states and error handling implemented
- [ ] Component tests verify list rendering and interactions

## Technical Notes

- Use FlatList with getItemLayout for optimal scroll performance
- Implement proper memoization for expensive calculations
- Consider virtual scrolling for very large datasets
- Use React Navigation for detail screen transitions

## Dependencies

- **Prerequisite**: Epic 1 (Foundation) and Story 2.1 (Run Completion) completed
- **Integration**: Database repository for run retrieval
- **Related**: Story 2.3 (Run Details) for detail view navigation

## Risks

- Performance degradation with large numbers of runs
- Complex sorting/filtering logic creating bugs
- Memory usage issues with GPS data in large lists
- User confusion with too many filtering options