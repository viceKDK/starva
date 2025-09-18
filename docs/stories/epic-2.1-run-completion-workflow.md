# Story 2.1: Run Completion and Save Workflow

**Epic**: Core Run Tracking Features
**Story ID**: 2.1
**Priority**: Must Have
**Estimated Effort**: 5-6 hours

## User Story

As a user,
I want to complete and save my run with a summary screen showing my performance,
so that I can review my results and save them to my run history.

## Acceptance Criteria

### 1. Run Completion Trigger
- [ ] "Stop" button in tracking screen initiates completion workflow
- [ ] Confirmation dialog prevents accidental run completion
- [ ] GPS tracking stops immediately upon confirmation
- [ ] Session state transitions to "completing" during save process

### 2. Run Summary Screen
- [ ] Dedicated completion screen shows comprehensive run summary
- [ ] Total distance displayed prominently in kilometers (2 decimal places)
- [ ] Total duration shown in HH:MM:SS format
- [ ] Average pace calculated and displayed in MM:SS per kilometer
- [ ] Start and end times displayed with proper formatting
- [ ] Route map preview showing GPS track (if available)

### 3. Run Naming and Notes
- [ ] Default run name generated based on time of day ("Morning Run", "Evening Run")
- [ ] Editable text field allows custom run naming
- [ ] Optional notes field for user comments about the run
- [ ] Character limits enforced (50 chars for name, 500 for notes)
- [ ] Input validation prevents empty names

### 4. Save Operation
- [ ] "Save Run" button persists run data to local database
- [ ] Save operation shows progress indicator during database write
- [ ] Success confirmation displayed after successful save
- [ ] Automatic navigation to run history after save completion
- [ ] Run data includes all GPS points and calculated metrics

### 5. Alternative Actions
- [ ] "Discard Run" option available for incomplete or invalid runs
- [ ] Discard confirmation dialog prevents accidental data loss
- [ ] "Continue Tracking" option returns to active session
- [ ] Share functionality for basic run statistics (optional)

### 6. Data Validation and Quality
- [ ] Minimum run distance validation (100 meters)
- [ ] Minimum run duration validation (60 seconds)
- [ ] GPS data quality check before save
- [ ] Invalid runs handled with user-friendly error messages
- [ ] Data integrity validation before database persistence

### 7. Performance Metrics Calculation
- [ ] Distance calculated from GPS points using haversine formula
- [ ] Duration calculated excluding paused time
- [ ] Average pace computed from total distance and active duration
- [ ] Metrics rounded to appropriate precision for display
- [ ] Calculation errors handled gracefully

### 8. Error Handling
- [ ] Database save failures handled with retry mechanism
- [ ] Storage full scenarios prompt user for action
- [ ] Corrupted GPS data detection with user notification
- [ ] Network independence maintained (no cloud dependency)

## Implementation Details

### Completion Screen Component
```typescript
// src/presentation/screens/RunCompletionScreen.tsx
export const RunCompletionScreen: React.FC = () => {
  const controller = useRunCompletionController();

  return (
    <RunCompletionView
      runSummary={controller.runSummary}
      isLoading={controller.isSaving}
      onSave={controller.saveRun}
      onDiscard={controller.discardRun}
      onContinue={controller.continueTracking}
    />
  );
};
```

### Save Run Use Case
```typescript
// src/application/usecases/SaveRunUseCase.ts
export class SaveRunUseCase {
  constructor(
    private runRepository: IRunRepository,
    private metricsCalculator: IMetricsCalculator
  ) {}

  async execute(session: RunSession, name: string, notes: string): Promise<Result<RunId, SaveError>> {
    const metrics = this.metricsCalculator.calculate(session.gpsPoints);
    const run = Run.create(session, metrics, name, notes);
    return await this.runRepository.save(run);
  }
}
```

### Metrics Calculation Service
```typescript
// src/domain/services/MetricsCalculator.ts
export class MetricsCalculator implements IMetricsCalculator {
  calculateDistance(points: GPSPoint[]): Distance {
    // Haversine formula implementation
  }

  calculateDuration(session: RunSession): Duration {
    // Active duration excluding paused time
  }

  calculateAveragePace(distance: Distance, duration: Duration): Pace {
    // Minutes per kilometer calculation
  }
}
```

## Definition of Done

- [ ] Run completion workflow functions end-to-end
- [ ] All metrics calculated accurately and displayed properly
- [ ] Save operation persists complete run data to database
- [ ] User can customize run name and add notes
- [ ] Error scenarios handled gracefully with user feedback
- [ ] Data validation prevents invalid runs from being saved
- [ ] Navigation flows correctly between screens
- [ ] Performance meets requirements for large GPS datasets

## Technical Notes

- Use React Hook Form for input validation and management
- Implement proper loading states during save operations
- Consider GPS point compression for storage efficiency
- Follow iOS design patterns for confirmation dialogs

## Dependencies

- **Prerequisite**: Epic 1 (Foundation) must be completed
- **Integration**: Database repository for run persistence
- **Related**: Story 2.2 (Run History) displays saved runs

## Risks

- Large GPS datasets causing save operation delays
- User confusion during multi-step completion workflow
- Data loss if save operation fails unexpectedly
- Complex metrics calculation errors with edge cases