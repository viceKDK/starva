import { IRunRepository } from '@/domain/repositories';
import { RunDataValidationService } from './RunDataValidationService';
import { GPSDataValidationService } from './GPSDataValidationService';

export interface DataIntegrityReport {
  totalRuns: number;
  validRuns: number;
  runsWithErrors: number;
  runsWithWarnings: number;
  corruptedRuns: RunIntegrityIssue[];
  recommendations: string[];
}

export interface RunIntegrityIssue {
  runId: string;
  runName: string;
  errors: string[];
  warnings: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class DataIntegrityService {
  constructor(
    private readonly runRepository: IRunRepository,
    private readonly runValidator: RunDataValidationService,
    private readonly gpsValidator: GPSDataValidationService
  ) {}

  async performIntegrityCheck(): Promise<DataIntegrityReport> {
    const allRunsResult = await this.runRepository.findAll();

    if (!allRunsResult.success) {
      throw new Error('Failed to retrieve runs for integrity check');
    }

    const runs = allRunsResult.data!;
    const issues: RunIntegrityIssue[] = [];
    let validRuns = 0;
    let runsWithErrors = 0;
    let runsWithWarnings = 0;

    for (const run of runs) {
      try {
        // Validate run data
        const runValidation = this.runValidator.validateRun(run);

        // Validate GPS data if available
        let gpsValidation = null;
        if (run.route && run.route.length > 0) {
          gpsValidation = this.gpsValidator.validateAndFilterGPSData(run.route);
        }

        const hasErrors = runValidation.errors.length > 0 || (gpsValidation && !gpsValidation.isValid);
        const hasWarnings = runValidation.warnings.length > 0 || (gpsValidation && gpsValidation.qualityScore < 60);

        if (hasErrors || hasWarnings) {
          const allErrors = [...runValidation.errors];
          const allWarnings = [...runValidation.warnings];

          if (gpsValidation && !gpsValidation.isValid) {
            allErrors.push('GPS data validation failed');
          }

          if (gpsValidation && gpsValidation.qualityScore < 60) {
            allWarnings.push(`Poor GPS quality score: ${gpsValidation.qualityScore}/100`);
          }

          const severity = this.determineSeverity(allErrors, allWarnings);

          issues.push({
            runId: run.id?.value || 'unknown',
            runName: run.name || 'Unknown Run',
            errors: allErrors,
            warnings: allWarnings,
            severity
          });

          if (hasErrors) runsWithErrors++;
          else if (hasWarnings) runsWithWarnings++;
        } else {
          validRuns++;
        }
      } catch (error) {
        // Handle corrupted run data
        issues.push({
          runId: run.id?.value || 'unknown',
          runName: run.name || 'Unknown Run',
          errors: [`Data corruption: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
          severity: 'critical'
        });
        runsWithErrors++;
      }
    }

    const recommendations = this.generateRecommendations(issues, runs.length);

    return {
      totalRuns: runs.length,
      validRuns,
      runsWithErrors,
      runsWithWarnings,
      corruptedRuns: issues,
      recommendations
    };
  }

  async fixAutomaticIssues(): Promise<{
    fixed: number;
    errors: string[];
  }> {
    const allRunsResult = await this.runRepository.findAll();

    if (!allRunsResult.success) {
      throw new Error('Failed to retrieve runs for automatic fixing');
    }

    const runs = allRunsResult.data;
    let fixedCount = 0;
    const errors: string[] = [];

    for (const run of runs) {
      try {
        let needsUpdate = false;
        const updates: any = {};

        // Fix GPS data if possible
        if (run.route && run.route.length > 0) {
          const gpsValidation = this.gpsValidator.validateAndFilterGPSData(run.route);

          if (gpsValidation.filteredPoints.length !== run.route.length && gpsValidation.isValid) {
            updates.route = gpsValidation.filteredPoints;
            needsUpdate = true;
          }
        }

        // Fix calculated fields
        if (run.startTime && run.endTime) {
          const calculatedDuration = Math.floor((run.endTime.getTime() - run.startTime.getTime()) / 1000);
          if (Math.abs(calculatedDuration - run.duration) > 60) {
            updates.duration = calculatedDuration;
            needsUpdate = true;
          }
        }

        // Recalculate average pace if inconsistent
        if (run.distance && run.duration) {
          const calculatedPace = run.duration / (run.distance / 1000);
          if (Math.abs(calculatedPace - run.averagePace) > 60) {
            updates.averagePace = calculatedPace;
            needsUpdate = true;
          }
        }

        // Apply updates if needed
        if (needsUpdate) {
          const updateResult = await this.runRepository.update(run.id, updates);
          if (updateResult.success) {
            fixedCount++;
          } else {
            errors.push(`Failed to fix run ${run.name}: ${updateResult.error}`);
          }
        }
      } catch (error) {
        errors.push(`Error fixing run ${run.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { fixed: fixedCount, errors };
  }

  async validateDatabaseStructure(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Test basic database operations
      const testResult = await this.runRepository.findAll();
      if (!testResult.success) {
        issues.push('Cannot read from runs table');
      }

      // Check for orphaned data or referential integrity issues
      // This would be expanded based on your specific database structure

      // For now, we'll do basic checks
      if (testResult.success) {
        const runs = testResult.data;

        // Check for duplicate IDs
        const ids = runs.map(r => r.id.value);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          issues.push('Duplicate run IDs detected');
        }

        // Check for null or invalid data
        for (const run of runs) {
          if (!run.id || !run.startTime || !run.endTime) {
            issues.push(`Run ${run.name || 'unknown'} has missing critical data`);
          }
        }
      }
    } catch (error) {
      issues.push(`Database structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private determineSeverity(errors: string[], warnings: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (errors.some(e => e.includes('corruption') || e.includes('critical'))) {
      return 'critical';
    }

    if (errors.length > 0) {
      return 'high';
    }

    if (warnings.some(w => w.includes('GPS') || w.includes('distance'))) {
      return 'medium';
    }

    return 'low';
  }

  private generateRecommendations(issues: RunIntegrityIssue[], totalRuns: number): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const gpsIssues = issues.filter(i =>
      i.errors.some(e => e.includes('GPS')) ||
      i.warnings.some(w => w.includes('GPS'))
    ).length;

    if (criticalIssues > 0) {
      recommendations.push(`${criticalIssues} run(s) have critical data corruption and should be reviewed manually`);
    }

    if (highIssues > 0) {
      recommendations.push(`${highIssues} run(s) have validation errors that may affect accuracy`);
    }

    if (gpsIssues > totalRuns * 0.1) {
      recommendations.push('Consider reviewing GPS tracking settings to improve data quality');
    }

    if (issues.length > totalRuns * 0.2) {
      recommendations.push('High number of data quality issues detected - consider running automatic fixes');
    }

    if (recommendations.length === 0) {
      recommendations.push('All runs passed validation checks - excellent data quality!');
    }

    return recommendations;
  }
}