import { PersonalRecord, RecordCategory } from '@/domain/entities/PersonalRecord';
import { Run } from '@/domain/entities/Run';
import { IPersonalRecordRepository } from '@/domain/repositories/IPersonalRecordRepository';
import { Result } from '@/shared/types';

export class PersonalRecordDetectionService {
  constructor(
    private recordRepository: IPersonalRecordRepository
  ) {}

  async detectNewRecords(run: Run): Promise<Result<PersonalRecord[], string>> {
    try {
      const newRecords: PersonalRecord[] = [];
      const categories = this.getApplicableCategories(run);

      for (const category of categories) {
        const currentRecordResult = await this.recordRepository.findByCategory(category);

        if (!currentRecordResult.success) {
          console.error(`Failed to fetch current record for ${category}:`, currentRecordResult.error);
          continue;
        }

        const currentRecord = currentRecordResult.data;
        const newValue = this.extractValueForCategory(run, category);

        if (newValue !== null && this.isNewRecord(newValue, currentRecord, category)) {
          const record = PersonalRecord.create(
            category,
            newValue,
            { value: run.id },
            currentRecord?.value
          );
          newRecords.push(record);
        }
      }

      return { success: true, data: newRecords };
    } catch (error) {
      console.error('Error detecting personal records:', error);
      return { success: false, error: `Failed to detect personal records: ${error}` };
    }
  }

  private getApplicableCategories(run: Run): RecordCategory[] {
    const categories: RecordCategory[] = ['LONGEST_DISTANCE', 'LONGEST_DURATION'];
    const distanceKm = run.distance / 1000;

    // Add pace categories based on run distance
    if (distanceKm >= 1) {
      categories.push('BEST_PACE_1K');
    }

    if (distanceKm >= 5) {
      categories.push('FASTEST_5K', 'BEST_PACE_5K');
    }

    if (distanceKm >= 10) {
      categories.push('FASTEST_10K');
    }

    if (distanceKm >= 21.1) {
      categories.push('FASTEST_HALF_MARATHON');
    }

    return categories;
  }

  private extractValueForCategory(run: Run, category: RecordCategory): number | null {
    const distanceKm = run.distance / 1000;

    switch (category) {
      case 'LONGEST_DISTANCE':
        return run.distance; // in meters

      case 'LONGEST_DURATION':
        return run.duration; // in seconds

      case 'BEST_PACE_1K':
      case 'BEST_PACE_5K':
        // Return average pace for the entire run if it meets minimum distance
        const minimumDistance = category === 'BEST_PACE_1K' ? 1 : 5;
        if (distanceKm >= minimumDistance) {
          return run.averagePace; // seconds per km
        }
        return null;

      case 'FASTEST_5K':
        if (distanceKm >= 5) {
          // For time-based records, we calculate the time for that specific distance
          // For now, we'll use the average pace to estimate the 5K time
          return 5000 * (run.averagePace / 1000); // estimated 5K time in seconds
        }
        return null;

      case 'FASTEST_10K':
        if (distanceKm >= 10) {
          return 10000 * (run.averagePace / 1000); // estimated 10K time in seconds
        }
        return null;

      case 'FASTEST_HALF_MARATHON':
        if (distanceKm >= 21.1) {
          return 21100 * (run.averagePace / 1000); // estimated half marathon time in seconds
        }
        return null;

      default:
        return null;
    }
  }

  private isNewRecord(
    newValue: number,
    currentRecord: PersonalRecord | null,
    category: RecordCategory
  ): boolean {
    // If no current record exists, any valid value is a new record
    if (!currentRecord) {
      return this.isValidRecordValue(newValue, category);
    }

    // Check if the new value is valid
    if (!this.isValidRecordValue(newValue, category)) {
      return false;
    }

    // For time-based records (duration, pace, fastest times), lower is better
    if (this.isTimeBased(category)) {
      return newValue < currentRecord.value;
    }

    // For distance-based records, higher is better
    return newValue > currentRecord.value;
  }

  private isTimeBased(category: RecordCategory): boolean {
    return category.includes('FASTEST') ||
           category.includes('PACE') ||
           category === 'LONGEST_DURATION';
  }

  private isValidRecordValue(value: number, category: RecordCategory): boolean {
    // Basic validation to prevent obviously invalid records
    if (value <= 0 || !isFinite(value)) {
      return false;
    }

    switch (category) {
      case 'LONGEST_DISTANCE':
        return value >= 100; // minimum 100 meters

      case 'LONGEST_DURATION':
        return value >= 60; // minimum 1 minute

      case 'BEST_PACE_1K':
      case 'BEST_PACE_5K':
        // Pace should be reasonable (between 2:00/km and 20:00/km)
        return value >= 120 && value <= 1200; // 2-20 minutes per km in seconds

      case 'FASTEST_5K':
        // 5K time should be reasonable (between 10 minutes and 2 hours)
        return value >= 600 && value <= 7200;

      case 'FASTEST_10K':
        // 10K time should be reasonable (between 20 minutes and 4 hours)
        return value >= 1200 && value <= 14400;

      case 'FASTEST_HALF_MARATHON':
        // Half marathon time should be reasonable (between 1 hour and 6 hours)
        return value >= 3600 && value <= 21600;

      default:
        return true;
    }
  }

  async saveNewRecords(records: PersonalRecord[]): Promise<Result<void, string>> {
    try {
      for (const record of records) {
        const saveResult = await this.recordRepository.save(record);
        if (!saveResult.success) {
          console.error(`Failed to save record ${record.category}:`, saveResult.error);
          return saveResult;
        }
      }
      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error saving personal records:', error);
      return { success: false, error: `Failed to save personal records: ${error}` };
    }
  }
}