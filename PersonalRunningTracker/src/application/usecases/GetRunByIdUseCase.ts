import { Run } from '@/domain/entities';
import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { Result } from '@/shared/types';

export class GetRunByIdUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(runId: string): Promise<Result<Run, DatabaseError>> {
    try {
      const result = await this.runRepository.findById(runId);

      if (!result.success) {
        return { success: false, error: result.error! };
      }

      if (!result.data) {
        return { success: false, error: 'NOT_FOUND' };
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('GetRunByIdUseCase error:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }
}