import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { Result } from '@/shared/types';

export class DeleteRunUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(runId: string): Promise<Result<void, DatabaseError>> {
    try {
      // Check if run exists before attempting to delete
      const runResult = await this.runRepository.findById(runId);
      if (!runResult.success || !runResult.data) {
        return { success: false, error: 'NOT_FOUND' };
      }

      // Delete the run
      const deleteResult = await this.runRepository.delete(runId);
      if (!deleteResult.success) {
        return { success: false, error: deleteResult.error! };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('DeleteRunUseCase error:', error);
      return { success: false, error: 'DELETE_FAILED' };
    }
  }
}