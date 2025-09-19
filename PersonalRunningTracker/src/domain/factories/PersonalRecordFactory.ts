import { PersonalRecord, PersonalRecordId, RecordCategory } from '@/domain/entities/PersonalRecord';
import { Run, RunId } from '@/domain/entities';

export interface CreatePersonalRecordOptions {
  category: RecordCategory;
  value: number;
  runId: RunId;
  achievedAt?: Date;
  previousValue?: number;
}

export interface RecordAnalysis {
  category: RecordCategory;
  currentValue: number;
  isNewRecord: boolean;
  improvement?: number;
  improvementPercentage?: number;
}

export class PersonalRecordFactory {
  static create(options: CreatePersonalRecordOptions): PersonalRecord {
    const { category, value, runId, achievedAt, previousValue } = options;

    return new PersonalRecord(
      PersonalRecordId.generate(),
      category,
      value,
      runId,
      achievedAt || new Date(),
      previousValue
    );
  }

  static createFromRun(
    run: Run,
    category: RecordCategory,
    previousValue?: number
  ): PersonalRecord {
    const value = this.extractValueFromRun(run, category);

    if (value === null) {
      throw new Error(`Cannot extract ${category} value from run`);
    }

    return this.create({
      category,
      value,
      runId: run.id,
      achievedAt: run.endTime,
      previousValue
    });
  }

  static createMultipleFromRun(
    run: Run,
    categories: RecordCategory[],
    previousRecords: Map<RecordCategory, number> = new Map()
  ): PersonalRecord[] {
    const records: PersonalRecord[] = [];

    for (const category of categories) {
      try {
        const previousValue = previousRecords.get(category);
        const record = this.createFromRun(run, category, previousValue);
        records.push(record);
      } catch (error) {
        // Skip categories that can't be extracted from this run
        console.warn(`Could not create ${category} record from run:`, error);
      }
    }

    return records;
  }

  static analyzeRunForRecords(
    run: Run,
    existingRecords: PersonalRecord[]
  ): RecordAnalysis[] {
    const analyses: RecordAnalysis[] = [];
    const categories = this.getAllCategories();

    for (const category of categories) {
      const analysis = this.analyzeCategory(run, category, existingRecords);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    return analyses;
  }

  static createRecordsForNewPRs(
    run: Run,
    analyses: RecordAnalysis[]
  ): PersonalRecord[] {
    return analyses
      .filter(analysis => analysis.isNewRecord)
      .map(analysis => this.createFromRun(run, analysis.category));
  }

  private static extractValueFromRun(run: Run, category: RecordCategory): number | null {
    const distanceKm = run.distance / 1000;

    switch (category) {
      case '1K':
        return distanceKm >= 1 ? run.averagePace : null;
      case '5K':
        return distanceKm >= 5 ? run.averagePace : null;
      case '10K':
        return distanceKm >= 10 ? run.averagePace : null;
      case 'half_marathon':
        return distanceKm >= 21.1 ? run.averagePace : null;
      case 'marathon':
        return distanceKm >= 42.2 ? run.averagePace : null;
      case 'longest_run':
        return run.distance;
      case 'fastest_pace':
        return run.averagePace;
      case 'longest_duration':
        return run.duration;
      default:
        return null;
    }
  }

  private static analyzeCategory(
    run: Run,
    category: RecordCategory,
    existingRecords: PersonalRecord[]
  ): RecordAnalysis | null {
    const currentValue = this.extractValueFromRun(run, category);
    if (currentValue === null) {
      return null;
    }

    const existingRecord = existingRecords.find(record => record.category === category);
    const existingValue = existingRecord?.value;

    let isNewRecord = false;
    let improvement: number | undefined;
    let improvementPercentage: number | undefined;

    if (!existingValue) {
      // First record in this category
      isNewRecord = true;
    } else {
      // Check if this is a new record
      isNewRecord = this.isBetterValue(category, currentValue, existingValue);

      if (isNewRecord) {
        improvement = this.calculateImprovement(category, currentValue, existingValue);
        improvementPercentage = Math.abs(improvement / existingValue) * 100;
      }
    }

    return {
      category,
      currentValue,
      isNewRecord,
      improvement,
      improvementPercentage
    };
  }

  private static isBetterValue(
    category: RecordCategory,
    newValue: number,
    existingValue: number
  ): boolean {
    // For pace-based records, lower is better
    const paceCategories: RecordCategory[] = ['1K', '5K', '10K', 'half_marathon', 'marathon', 'fastest_pace'];

    if (paceCategories.includes(category)) {
      return newValue < existingValue;
    }

    // For distance/duration-based records, higher is better
    return newValue > existingValue;
  }

  private static calculateImprovement(
    category: RecordCategory,
    newValue: number,
    existingValue: number
  ): number {
    const paceCategories: RecordCategory[] = ['1K', '5K', '10K', 'half_marathon', 'marathon', 'fastest_pace'];

    if (paceCategories.includes(category)) {
      // For pace, improvement is reduction in time
      return existingValue - newValue;
    }

    // For distance/duration, improvement is increase
    return newValue - existingValue;
  }

  private static getAllCategories(): RecordCategory[] {
    return [
      '1K',
      '5K',
      '10K',
      'half_marathon',
      'marathon',
      'longest_run',
      'fastest_pace',
      'longest_duration'
    ];
  }

  static createMockRecord(overrides?: Partial<CreatePersonalRecordOptions>): PersonalRecord {
    const defaultOptions: CreatePersonalRecordOptions = {
      category: '5K',
      value: 300, // 5:00 min/km pace
      runId: RunId.generate(),
      achievedAt: new Date(),
      ...overrides
    };

    return this.create(defaultOptions);
  }

  static createMockRecords(count: number = 5): PersonalRecord[] {
    const categories: RecordCategory[] = ['1K', '5K', '10K', 'longest_run', 'fastest_pace'];
    const records: PersonalRecord[] = [];

    for (let i = 0; i < Math.min(count, categories.length); i++) {
      const category = categories[i];
      const baseValue = this.getMockValueForCategory(category);
      const variation = 0.8 + Math.random() * 0.4; // ±20% variation

      records.push(this.createMockRecord({
        category,
        value: baseValue * variation,
        achievedAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000) // i weeks ago
      }));
    }

    return records;
  }

  private static getMockValueForCategory(category: RecordCategory): number {
    switch (category) {
      case '1K': return 240; // 4:00 min/km
      case '5K': return 300; // 5:00 min/km
      case '10K': return 330; // 5:30 min/km
      case 'half_marathon': return 360; // 6:00 min/km
      case 'marathon': return 390; // 6:30 min/km
      case 'longest_run': return 21100; // 21.1 km
      case 'fastest_pace': return 240; // 4:00 min/km
      case 'longest_duration': return 7200; // 2 hours
      default: return 300;
    }
  }
}