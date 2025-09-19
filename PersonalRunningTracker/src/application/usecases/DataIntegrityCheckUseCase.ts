import { IRunRepository } from '@/domain/repositories';
import { DataIntegrityService, DataIntegrityReport } from '@/application/services/DataIntegrityService';
import { RunDataValidationService } from '@/application/services/RunDataValidationService';
import { GPSDataValidationService } from '@/application/services/GPSDataValidationService';
import { Result } from '@/shared/types';

export class DataIntegrityCheckUseCase {
  private dataIntegrityService: DataIntegrityService;

  constructor(private runRepository: IRunRepository) {
    const runValidator = new RunDataValidationService();
    const gpsValidator = new GPSDataValidationService();
    this.dataIntegrityService = new DataIntegrityService(
      runRepository,
      runValidator,
      gpsValidator
    );
  }

  async execute(): Promise<Result<DataIntegrityReport, string>> {
    try {
      const report = await this.dataIntegrityService.performIntegrityCheck();
      return { success: true, data: report };
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async fixAutomaticIssues(): Promise<Result<{ fixed: number; errors: string[] }, string>> {
    try {
      const result = await this.dataIntegrityService.fixAutomaticIssues();
      return { success: true, data: result };
    } catch (error) {
      console.error('Automatic fix failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async validateDatabaseStructure(): Promise<Result<{ isValid: boolean; issues: string[] }, string>> {
    try {
      const result = await this.dataIntegrityService.validateDatabaseStructure();
      return { success: true, data: result };
    } catch (error) {
      console.error('Database structure validation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}