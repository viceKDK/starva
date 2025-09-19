import { PersonalRecord } from '@/domain/entities/PersonalRecord';
import { IPersonalRecordRepository } from '@/domain/repositories/IPersonalRecordRepository';
import { Result } from '@/shared/types';

export class GetAllPersonalRecordsUseCase {
  constructor(private personalRecordRepository: IPersonalRecordRepository) {}

  async execute(): Promise<Result<PersonalRecord[], string>> {
    try {
      const result = await this.personalRecordRepository.findAll();

      if (!result.success) {
        return result;
      }

      // Sort records by category for consistent display
      const sortedRecords = result.data.sort((a, b) => {
        const categoryOrder = [
          'LONGEST_DISTANCE',
          'LONGEST_DURATION',
          'FASTEST_5K',
          'FASTEST_10K',
          'FASTEST_HALF_MARATHON',
          'BEST_PACE_1K',
          'BEST_PACE_5K'
        ];

        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);

        return aIndex - bIndex;
      });

      return {
        success: true,
        data: sortedRecords
      };
    } catch (error) {
      console.error('GetAllPersonalRecordsUseCase error:', error);
      return {
        success: false,
        error: `Failed to retrieve personal records: ${error}`
      };
    }
  }
}