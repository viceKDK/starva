import { Run } from '@/domain/entities';
import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { Result } from '@/shared/types';

export interface UpdateRunData {
  name?: string;
  notes?: string;
}

export class UpdateRunUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(runId: string, updates: UpdateRunData): Promise<Result<Run, DatabaseError>> {
    try {
      // First get the current run
      const currentRunResult = await this.runRepository.findById(runId);
      if (!currentRunResult.success || !currentRunResult.data) {
        return { success: false, error: 'NOT_FOUND' };
      }

      const currentRun = currentRunResult.data;

      // Validate updates
      const validationError = this.validateUpdates(updates);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Create updated run
      const updatedRun: Run = {
        ...currentRun,
        name: updates.name?.trim() || currentRun.name,
        notes: updates.notes?.trim() || currentRun.notes
      };

      // Update in repository
      const updateResult = await this.runRepository.update(runId, updatedRun);
      if (!updateResult.success) {
        return { success: false, error: updateResult.error! };
      }

      return { success: true, data: updatedRun };
    } catch (error) {
      console.error('UpdateRunUseCase error:', error);
      return { success: false, error: 'SAVE_FAILED' };
    }
  }

  private validateUpdates(updates: UpdateRunData): DatabaseError | null {
    // Name validation
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        return 'SAVE_FAILED'; // Empty name not allowed
      }
      if (updates.name.length > 50) {
        return 'SAVE_FAILED'; // Name too long
      }
    }

    // Notes validation
    if (updates.notes !== undefined && updates.notes.length > 500) {
      return 'SAVE_FAILED'; // Notes too long
    }

    return null;
  }
}