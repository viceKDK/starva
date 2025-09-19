import { IRunRepository, Result, DatabaseError, RunId } from '../../domain/repositories/IRunRepository';
import { Run, GPSPoint } from '../../domain/entities';
import { DatabaseService } from './DatabaseService';
import { MigrationService } from './MigrationService';

export class SQLiteRunRepository implements IRunRepository {
  private databaseService: DatabaseService;
  private migrationService: MigrationService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.migrationService = new MigrationService();
  }

  async initialize(): Promise<Result<void, DatabaseError>> {
    // Initialize database and run migrations
    const connectionResult = await this.databaseService.initialize();
    if (!connectionResult.success) {
      return { success: false, error: connectionResult.error as DatabaseError };
    }

    const migrationResult = await this.migrationService.runMigrations();
    if (!migrationResult.success) {
      return { success: false, error: migrationResult.error as DatabaseError };
    }
    return { success: true };
  }

  async save(run: Run): Promise<Result<void, DatabaseError>> {
    const validationResult = this.validateRun(run);
    if (!validationResult.success) {
      return validationResult;
    }

    const result = await this.databaseService.executeTransaction(async (database) => {
      await database.runAsync(
        `INSERT INTO runs (
          id, start_time, end_time, distance, duration,
          average_pace, route_data, name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          run.id,
          run.startTime.toISOString(),
          run.endTime.toISOString(),
          run.distance,
          run.duration,
          run.averagePace,
          JSON.stringify(run.route),
          run.name,
          run.notes || '',
          run.createdAt.toISOString()
        ]
      );
    });

    return { success: result.success, error: result.error as DatabaseError };
  }

  async findById(id: RunId): Promise<Result<Run, DatabaseError>> {
    const connection = await this.databaseService.initialize();
    if (!connection.success) {
      return { success: false, error: connection.error as DatabaseError };
    }

    try {
      const database = connection.data!.database;
      const row = await database.getFirstAsync(
        'SELECT * FROM runs WHERE id = ?',
        [id]
      ) as any;

      if (!row) {
        return { success: false, error: 'NOT_FOUND' };
      }

      const run = this.mapRowToRun(row);
      return { success: true, data: run };
    } catch (error) {
      console.error('Failed to find run by id:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }

  async findAll(): Promise<Result<Run[], DatabaseError>> {
    const connection = await this.databaseService.initialize();
    if (!connection.success) {
      return { success: false, error: connection.error as DatabaseError };
    }

    try {
      const database = connection.data!.database;
      const rows = await database.getAllAsync(
        'SELECT * FROM runs ORDER BY created_at DESC'
      ) as any[];

      const runs = rows.map(row => this.mapRowToRun(row));
      return { success: true, data: runs };
    } catch (error) {
      console.error('Failed to find all runs:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }

  async delete(id: RunId): Promise<Result<void, DatabaseError>> {
    const result = await this.databaseService.executeTransaction(async (database) => {
      const deleteResult = await database.runAsync(
        'DELETE FROM runs WHERE id = ?',
        [id]
      );

      if (deleteResult.changes === 0) {
        throw new Error('Run not found');
      }
    });

    return { success: result.success, error: result.error as DatabaseError };
  }

  async update(id: RunId, updates: Partial<Run>): Promise<Result<void, DatabaseError>> {
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    const result = await this.databaseService.executeTransaction(async (database) => {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        setParts.push('name = ?');
        values.push(updates.name);
      }
      if (updates.notes !== undefined) {
        setParts.push('notes = ?');
        values.push(updates.notes);
      }
      if (updates.distance !== undefined) {
        setParts.push('distance = ?');
        values.push(updates.distance);
      }
      if (updates.duration !== undefined) {
        setParts.push('duration = ?');
        values.push(updates.duration);
      }
      if (updates.averagePace !== undefined) {
        setParts.push('average_pace = ?');
        values.push(updates.averagePace);
      }
      if (updates.route !== undefined) {
        setParts.push('route_data = ?');
        values.push(JSON.stringify(updates.route));
      }

      if (setParts.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);

      const updateResult = await database.runAsync(
        `UPDATE runs SET ${setParts.join(', ')} WHERE id = ?`,
        values
      );

      if (updateResult.changes === 0) {
        throw new Error('Run not found');
      }
    });

    return { success: result.success, error: result.error as DatabaseError };
  }

  private validateRun(run: Run): Result<void, DatabaseError> {
    if (!run.id || run.id.trim() === '') {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    if (!run.name || run.name.trim() === '') {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    if (run.distance < 0) {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    if (run.duration <= 0) {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    if (run.averagePace <= 0) {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    if (!Array.isArray(run.route)) {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    // Validate GPS points in route
    for (const point of run.route) {
      if (!this.validateGPSPoint(point)) {
        return { success: false, error: 'VALIDATION_FAILED' };
      }
    }

    if (run.startTime >= run.endTime) {
      return { success: false, error: 'VALIDATION_FAILED' };
    }

    return { success: true };
  }

  private validateGPSPoint(point: GPSPoint): boolean {
    if (typeof point.latitude !== 'number' ||
        typeof point.longitude !== 'number') {
      return false;
    }

    if (point.latitude < -90 || point.latitude > 90) {
      return false;
    }

    if (point.longitude < -180 || point.longitude > 180) {
      return false;
    }

    if (!(point.timestamp instanceof Date)) {
      return false;
    }

    return true;
  }

  private mapRowToRun(row: any): Run {
    let route: GPSPoint[];
    try {
      const routeData = JSON.parse(row.route_data);
      route = routeData.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }));
    } catch (error) {
      console.error('Failed to parse route data:', error);
      route = [];
    }

    return {
      id: row.id,
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      distance: row.distance,
      duration: row.duration,
      averagePace: row.average_pace,
      route,
      name: row.name,
      notes: row.notes,
      createdAt: new Date(row.created_at)
    };
  }
}