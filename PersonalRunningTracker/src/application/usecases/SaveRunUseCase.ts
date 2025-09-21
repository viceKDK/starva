import { Run } from '@/domain/entities';
import { PersonalRecord } from '@/domain/entities/PersonalRecord';
import { Achievement } from '@/domain/entities/Achievement';
import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { Result } from '@/shared/types';
import { AchievementDetectionService } from '@/application/services/AchievementDetectionService';
import { PersonalRecordDetectionService } from '@/application/services/PersonalRecordDetectionService';
import { SQLiteAchievementRepository } from '@/infrastructure/persistence/SQLiteAchievementRepository';
import { SQLitePersonalRecordRepository } from '@/infrastructure/persistence/SQLitePersonalRecordRepository';

export interface SaveRunResult {
  personalRecords: PersonalRecord[];
  achievements: Achievement[];
  dataQuality?: {
    gpsQualityScore: number;
    validationWarnings: string[];
  };
}

export class SaveRunUseCase {
  constructor(
    private runRepository: IRunRepository,
  ) {}

  async execute(run: Run, customName?: string, notes?: string): Promise<Result<SaveRunResult, DatabaseError>> {
    try {
      // Update run with custom name and notes if provided, without introducing undefined properties
      const updatedRun: Run = { ...run };
      if (customName && customName.trim()) {
        updatedRun.name = customName.trim();
      }
      if (notes !== undefined) {
        updatedRun.notes = notes.trim();
      }

      // Basic validation only (legacy)
      const finalRun = updatedRun;

      // Legacy validation for backward compatibility
      const legacyValidationError = this.validateRun(finalRun);
      if (legacyValidationError) {
        return { success: false, error: legacyValidationError };
      }

      // Save run to repository (use filtered run data)
      const saveResult = await this.runRepository.save(finalRun);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error! };
      }

      // Detect and persist personal records for this run
      const prRepo = new SQLitePersonalRecordRepository();
      const prService = new PersonalRecordDetectionService(prRepo);
      const detectedPRsResult = await prService.detectNewRecords(finalRun);

      let personalRecords: PersonalRecord[] = [];
      if (detectedPRsResult.success) {
        personalRecords = detectedPRsResult.data;
        if (personalRecords.length > 0) {
          const savePRsResult = await prService.saveNewRecords(personalRecords);
          if (!savePRsResult.success) {
            console.error('Failed to persist some personal records:', savePRsResult.error);
          }
        }
      } else {
        console.error('Personal record detection failed:', detectedPRsResult.error);
      }

      // Detect and persist achievements for this run
      const achievementRepo = new SQLiteAchievementRepository();
      const achievementService = new AchievementDetectionService(
        achievementRepo,
        this.runRepository
      );

      const detectedAchievementsResult = await achievementService.detectNewAchievements(finalRun);

      let achievements: Achievement[] = [];
      if (detectedAchievementsResult.success) {
        achievements = detectedAchievementsResult.data;
        if (achievements.length > 0) {
          // Persist newly detected achievements
          const saveAchievementsResult = await achievementService.saveNewAchievements(achievements);
          if (!saveAchievementsResult.success) {
            // Log and continue; achievements are non-blocking for run save
            console.error('Failed to persist some achievements:', saveAchievementsResult.error);
          }
        }
      } else {
        console.error('Achievement detection failed:', detectedAchievementsResult.error);
      }

      return {
        success: true,
        data: {
          personalRecords,
          achievements,
        }
      };
    } catch (error) {
      console.error('SaveRunUseCase error:', error);
      return { success: false, error: 'SAVE_FAILED' };
    }
  }

  private validateRun(run: Run): DatabaseError | null {
    // Minimum distance validation (100 meters)
    if (run.distance < 100) {
      return 'SAVE_FAILED'; // Using existing error type
    }

    // Minimum duration validation (60 seconds)
    if (run.duration < 60) {
      return 'SAVE_FAILED';
    }

    // Name validation
    if (!run.name || run.name.trim().length === 0) {
      return 'SAVE_FAILED';
    }

    if (run.name.length > 50) {
      return 'SAVE_FAILED';
    }

    // Notes validation
    if (run.notes && run.notes.length > 500) {
      return 'SAVE_FAILED';
    }

    // GPS data validation
    if (!run.route || run.route.length < 2) {
      return 'SAVE_FAILED';
    }

    return null;
  }
}
