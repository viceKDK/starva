import { PersonalRecord } from '@/domain/entities/PersonalRecord';
import { IRunRepository } from '@/domain/repositories/IRunRepository';
import { Result } from '@/shared/types';
import { SQLitePersonalRecordRepository } from '@/infrastructure/persistence/SQLitePersonalRecordRepository';
import { PersonalRecordDetectionService } from '@/application/services/PersonalRecordDetectionService';
import { Run } from '@/domain/entities';

export class BackfillPersonalRecordsUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(): Promise<Result<PersonalRecord[], string>> {
    try {
      // Fetch all runs
      const runsResult = await this.runRepository.findAll();
      if (!runsResult.success) {
        return { success: false, error: 'Failed to load runs for backfill' };
      }

      const runs = runsResult.data;
      if (runs.length === 0) {
        return { success: true, data: [] };
      }

      // Sort by createdAt ascending to build progression over time
      const sortedRuns = [...runs].sort(
        (a: Run, b: Run) => a.createdAt.getTime() - b.createdAt.getTime()
      );

      const prRepo = new SQLitePersonalRecordRepository();
      const prService = new PersonalRecordDetectionService(prRepo);

      const accumulated: PersonalRecord[] = [];

      for (const run of sortedRuns) {
        const detected = await prService.detectNewRecords(run);
        if (!detected.success) {
          // Log and continue
          console.error('Backfill PR detect failed:', detected.error);
          continue;
        }

        if (detected.data.length > 0) {
          const saveResult = await prService.saveNewRecords(detected.data);
          if (!saveResult.success) {
            console.error('Backfill PR save failed:', saveResult.error);
          }
          accumulated.push(...detected.data);
        }
      }

      return { success: true, data: accumulated };
    } catch (error) {
      console.error('BackfillPersonalRecordsUseCase error:', error);
      return { success: false, error: 'Failed to backfill personal records' };
    }
  }
}

