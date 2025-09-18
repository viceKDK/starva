# Story 4.1: Personal Records Detection and Tracking

**Epic**: Personal Records & Achievements
**Story ID**: 4.1
**Priority**: Should Have
**Estimated Effort**: 6-8 hours

## User Story

As a user,
I want the app to automatically detect and track my personal records,
so that I can celebrate my achievements and monitor my progress over time.

## Acceptance Criteria

### 1. Personal Record Categories
- [ ] Longest distance record tracked automatically
- [ ] Fastest 5K, 10K, and half-marathon times detected
- [ ] Best pace for 1K, 5K, 10K distances
- [ ] Longest duration run recorded
- [ ] Most elevation gain (if GPS provides altitude data)

### 2. Automatic Detection System
- [ ] New personal records detected immediately after run completion
- [ ] PR detection runs during run save process
- [ ] Historical runs analyzed for existing records on app installation
- [ ] Record validation ensures data quality before confirmation
- [ ] False positive prevention with minimum thresholds

### 3. Record Display and Notification
- [ ] Personal records highlighted in run completion screen
- [ ] "New PR!" badge displayed for record-breaking runs
- [ ] PR notification shown immediately after detection
- [ ] Records displayed in dedicated personal records screen
- [ ] Clear indication of when each record was achieved

### 4. Personal Records Dashboard
- [ ] Dedicated screen showing all current personal records
- [ ] Record categories organized clearly (distance, time, pace)
- [ ] Date achieved displayed for each record
- [ ] Progress indicators showing improvement trends
- [ ] Tap to view the specific run that set the record

### 5. Record Validation and Quality
- [ ] Minimum distance thresholds for pace records (500m minimum)
- [ ] Minimum duration requirements (2 minutes minimum)
- [ ] GPS accuracy validation for record legitimacy
- [ ] Manual record verification option for edge cases
- [ ] Corrupted or invalid runs excluded from records

### 6. Historical Record Analysis
- [ ] First-time app users: analyze all existing runs for records
- [ ] Progressive record tracking shows improvement over time
- [ ] Record progression chart for each category
- [ ] Previous record display when new one is achieved
- [ ] Record statistics (total PRs, improvement rate)

### 7. Record Management Features
- [ ] Manual record removal option (for invalid data)
- [ ] Record recalculation trigger for data corrections
- [ ] Export personal records summary
- [ ] Share individual record achievements
- [ ] Record backup and restore functionality

### 8. Performance and Data Integrity
- [ ] PR calculation completes within 2 seconds
- [ ] Record detection doesn't slow down run save process
- [ ] Database queries optimized for record lookups
- [ ] Record data stored separately for quick access
- [ ] Transaction integrity ensures accurate record keeping

## Implementation Details

### Personal Record Entity
```typescript
// src/domain/entities/PersonalRecord.ts
export class PersonalRecord {
  constructor(
    public readonly id: PersonalRecordId,
    public readonly category: RecordCategory,
    public readonly value: number,
    public readonly runId: RunId,
    public readonly achievedAt: Date,
    public readonly previousValue?: number
  ) {}

  static create(
    category: RecordCategory,
    value: number,
    runId: RunId,
    previousValue?: number
  ): PersonalRecord {
    return new PersonalRecord(
      PersonalRecordId.generate(),
      category,
      value,
      runId,
      new Date(),
      previousValue
    );
  }
}

export type RecordCategory =
  | 'LONGEST_DISTANCE'
  | 'FASTEST_5K'
  | 'FASTEST_10K'
  | 'FASTEST_HALF_MARATHON'
  | 'BEST_PACE_1K'
  | 'BEST_PACE_5K'
  | 'LONGEST_DURATION';
```

### PR Detection Service
```typescript
// src/application/services/PersonalRecordDetectionService.ts
export class PersonalRecordDetectionService {
  constructor(
    private recordRepository: IPersonalRecordRepository,
    private runRepository: IRunRepository
  ) {}

  async detectNewRecords(run: Run): Promise<PersonalRecord[]> {
    const newRecords: PersonalRecord[] = [];
    const categories = this.getApplicableCategories(run);

    for (const category of categories) {
      const currentRecord = await this.recordRepository.findByCategory(category);
      const newValue = this.extractValueForCategory(run, category);

      if (this.isNewRecord(newValue, currentRecord)) {
        const record = PersonalRecord.create(
          category,
          newValue,
          run.id,
          currentRecord?.value
        );
        newRecords.push(record);
      }
    }

    return newRecords;
  }

  private getApplicableCategories(run: Run): RecordCategory[] {
    const categories: RecordCategory[] = ['LONGEST_DISTANCE', 'LONGEST_DURATION'];

    // Add pace categories based on run distance
    if (run.distance.kilometers >= 1) categories.push('BEST_PACE_1K');
    if (run.distance.kilometers >= 5) categories.push('FASTEST_5K', 'BEST_PACE_5K');
    if (run.distance.kilometers >= 10) categories.push('FASTEST_10K');
    if (run.distance.kilometers >= 21.1) categories.push('FASTEST_HALF_MARATHON');

    return categories;
  }
}
```

### Personal Records Screen
```typescript
// src/presentation/screens/PersonalRecordsScreen.tsx
export const PersonalRecordsScreen: React.FC = () => {
  const controller = usePersonalRecordsController();

  return (
    <PersonalRecordsView
      records={controller.records}
      isLoading={controller.isLoading}
      onRecordTap={controller.navigateToRecord}
      onRefresh={controller.refreshRecords}
    />
  );
};
```

## Definition of Done

- [ ] Personal records detected automatically for all applicable categories
- [ ] New record notifications display immediately after achievement
- [ ] Personal records dashboard shows all current records accurately
- [ ] Record validation prevents false positives
- [ ] Historical record analysis works for existing users
- [ ] Performance meets requirements during record detection
- [ ] Database integrity maintained for all record operations
- [ ] Component tests verify record detection logic

## Technical Notes

- Store personal records in separate table for query optimization
- Use database triggers or application logic for record detection
- Consider caching current records for performance
- Implement proper transaction handling for record updates

## Dependencies

- **Prerequisite**: Stories 2.1 (Run Completion) and 2.2 (Run History) completed
- **Integration**: Database repository for record storage
- **Related**: Story 4.2 (Achievement System) for celebration features

## Risks

- Complex record detection logic creating edge case bugs
- Performance impact on run save process
- Data integrity issues with concurrent record updates
- User confusion about what constitutes a valid personal record