import { Run } from '@/domain/entities';
import { PersonalRecord } from '@/domain/entities/PersonalRecord';
import { Achievement } from '@/domain/entities/Achievement';
import { IRunRepository, DatabaseError } from '@/domain/repositories';
import { IPersonalRecordRepository } from '@/domain/repositories/IPersonalRecordRepository';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import {
  PersonalRecordDetectionService,
  AchievementDetectionService,
  RunDataValidationService,
  GPSDataValidationService
} from '@/application/services';
import { Result } from '@/shared/types';

export interface SaveRunResult {
  personalRecords: PersonalRecord[];
  achievements: Achievement[];
  dataQuality?: {
    gpsQualityScore: number;
    validationWarnings: string[];
  };
}

export class SaveRunUseCase {
  private personalRecordDetectionService: PersonalRecordDetectionService;
  private achievementDetectionService: AchievementDetectionService;
  private runDataValidator: RunDataValidationService;
  private gpsDataValidator: GPSDataValidationService;

  constructor(
    private runRepository: IRunRepository,
    private personalRecordRepository: IPersonalRecordRepository,
    private achievementRepository: IAchievementRepository
  ) {
    this.personalRecordDetectionService = new PersonalRecordDetectionService(
      this.personalRecordRepository
    );
    this.achievementDetectionService = new AchievementDetectionService(
      this.achievementRepository,
      this.runRepository
    );
    this.runDataValidator = new RunDataValidationService();
    this.gpsDataValidator = new GPSDataValidationService();
  }

  async execute(run: Run, customName?: string, notes?: string): Promise<Result<SaveRunResult, DatabaseError>> {
    try {
      // Update run with custom name and notes if provided
      const updatedRun: Run = {
        ...run,
        name: customName?.trim() || run.name,
        notes: notes?.trim() || run.notes
      };

      // Comprehensive data validation
      const runValidation = this.runDataValidator.validateRun(updatedRun);
      if (!runValidation.isValid) {
        console.error('Run validation failed:', runValidation.errors);
        return { success: false, error: 'SAVE_FAILED' };
      }

      // GPS data validation and filtering
      let finalRun = updatedRun;
      let gpsQualityScore = 100;
      const validationWarnings: string[] = [...runValidation.warnings];

      if (updatedRun.route && updatedRun.route.length > 0) {
        const gpsValidation = this.gpsDataValidator.validateAndFilterGPSData(updatedRun.route);

        if (!gpsValidation.isValid) {
          console.error('GPS validation failed');
          return { success: false, error: 'SAVE_FAILED' };
        }

        // Use filtered GPS data if it improved quality
        if (gpsValidation.removedPoints > 0 && gpsValidation.filteredPoints.length >= 5) {
          finalRun = {
            ...updatedRun,
            route: gpsValidation.filteredPoints
          };
          validationWarnings.push(`Filtered ${gpsValidation.removedPoints} GPS points to improve data quality`);
        }

        gpsQualityScore = gpsValidation.qualityScore;

        if (gpsQualityScore < 60) {
          validationWarnings.push('GPS data quality is below recommended threshold');
        }
      }

      // Legacy validation for backward compatibility
      const legacyValidationError = this.validateRun(finalRun);
      if (legacyValidationError) {
        return { success: false, error: legacyValidationError };
      }

      // Save run to repository (use filtered run data)
      const saveResult = await this.runRepository.save(finalRun);
      if (!saveResult.success) {
        return saveResult;
      }

      // Detect and save personal records (use final validated run)
      let personalRecords: PersonalRecord[] = [];
      const recordsResult = await this.personalRecordDetectionService.detectNewRecords(finalRun);

      if (recordsResult.success && recordsResult.data.length > 0) {
        const saveRecordsResult = await this.personalRecordDetectionService.saveNewRecords(recordsResult.data);
        if (saveRecordsResult.success) {
          personalRecords = recordsResult.data;
        } else {
          console.warn('Failed to save personal records, but run was saved successfully');
        }
      }

      // Detect and save achievements (use final validated run)
      let achievements: Achievement[] = [];
      const achievementsResult = await this.achievementDetectionService.detectNewAchievements(finalRun);

      if (achievementsResult.success && achievementsResult.data.length > 0) {
        const saveAchievementsResult = await this.achievementDetectionService.saveNewAchievements(achievementsResult.data);
        if (saveAchievementsResult.success) {
          achievements = achievementsResult.data;
        } else {
          console.warn('Failed to save achievements, but run was saved successfully');
        }
      }

      return {
        success: true,
        data: {
          personalRecords,
          achievements,
          dataQuality: {
            gpsQualityScore,
            validationWarnings
          }
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