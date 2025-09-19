import * as SQLite from 'expo-sqlite';
import { DatabaseService } from './DatabaseService';
import { Result, DatabaseError } from '../../domain/repositories/IRunRepository';

export interface Migration {
  version: string;
  up: string[];
  down: string[];
}

export class MigrationService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  private migrations: Migration[] = [
    {
      version: '001_initial_schema',
      up: [
        `CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT NOT NULL UNIQUE,
          applied_at TEXT NOT NULL
        );`,

        `CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          distance REAL NOT NULL,
          duration INTEGER NOT NULL,
          average_pace REAL NOT NULL,
          route_data TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT 'Morning Run',
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          CONSTRAINT valid_distance CHECK (distance >= 0),
          CONSTRAINT valid_duration CHECK (duration > 0),
          CONSTRAINT valid_pace CHECK (average_pace > 0)
        );`,

        `CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_runs_distance ON runs(distance);`,
        `CREATE INDEX IF NOT EXISTS idx_runs_duration ON runs(duration);`,

        // Personal Records table
        `CREATE TABLE IF NOT EXISTS personal_records (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          value REAL NOT NULL,
          run_id TEXT NOT NULL,
          achieved_at TEXT NOT NULL,
          previous_value REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category)
        );`,
        `CREATE INDEX IF NOT EXISTS idx_personal_records_category ON personal_records(category);`,

        // Achievements table
        `CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          criteria TEXT NOT NULL,
          earned_at TEXT,
          run_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);`,
        `CREATE INDEX IF NOT EXISTS idx_achievements_earned ON achievements(earned_at);`
      ],
      down: [
        'DROP INDEX IF EXISTS idx_achievements_earned;',
        'DROP INDEX IF EXISTS idx_achievements_type;',
        'DROP TABLE IF EXISTS achievements;',
        'DROP INDEX IF EXISTS idx_personal_records_category;',
        'DROP TABLE IF EXISTS personal_records;',
        'DROP INDEX IF EXISTS idx_runs_duration;',
        'DROP INDEX IF EXISTS idx_runs_distance;',
        'DROP INDEX IF EXISTS idx_runs_created_at;',
        'DROP TABLE IF EXISTS runs;',
        'DROP TABLE IF EXISTS migrations;'
      ]
    }
  ];

  public async runMigrations(): Promise<Result<void, DatabaseError>> {
    const connection = await this.databaseService.initialize();
    if (!connection.success) {
      return { success: false, error: connection.error as DatabaseError };
    }

    try {
      const database = connection.data!.database;

      // Ensure migrations table exists
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT NOT NULL UNIQUE,
          applied_at TEXT NOT NULL
        );
      `);

      // Get applied migrations
      const appliedMigrations = await database.getAllAsync(
        'SELECT version FROM migrations ORDER BY applied_at ASC;'
      ) as { version: string }[];

      const appliedVersions = new Set(appliedMigrations.map(m => m.version));

      // Apply pending migrations
      for (const migration of this.migrations) {
        if (!appliedVersions.has(migration.version)) {
          await this.applyMigration(database, migration);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, error: 'MIGRATION_FAILED' as DatabaseError };
    }
  }

  private async applyMigration(
    database: SQLite.SQLiteDatabase,
    migration: Migration
  ): Promise<void> {
    console.log(`Applying migration: ${migration.version}`);

    await database.withTransactionAsync(async () => {
      // Execute migration statements
      for (const statement of migration.up) {
        await database.execAsync(statement);
      }

      // Record migration as applied
      await database.runAsync(
        'INSERT INTO migrations (version, applied_at) VALUES (?, ?);',
        [migration.version, new Date().toISOString()]
      );
    });

    console.log(`Migration ${migration.version} applied successfully`);
  }

  public async rollbackMigration(version: string): Promise<Result<void, DatabaseError>> {
    const connection = await this.databaseService.initialize();
    if (!connection.success) {
      return { success: false, error: connection.error as DatabaseError };
    }

    try {
      const database = connection.data!.database;
      const migration = this.migrations.find(m => m.version === version);

      if (!migration) {
        return { success: false, error: 'NOT_FOUND' };
      }

      await database.withTransactionAsync(async () => {
        // Execute rollback statements
        for (const statement of migration.down) {
          await database.execAsync(statement);
        }

        // Remove migration record
        await database.runAsync(
          'DELETE FROM migrations WHERE version = ?;',
          [version]
        );
      });

      console.log(`Migration ${version} rolled back successfully`);
      return { success: true };
    } catch (error) {
      console.error('Migration rollback failed:', error);
      return { success: false, error: 'MIGRATION_FAILED' as DatabaseError };
    }
  }

  public async getAppliedMigrations(): Promise<Result<string[], DatabaseError>> {
    const connection = await this.databaseService.initialize();
    if (!connection.success) {
      return { success: false, error: connection.error as DatabaseError };
    }

    try {
      const database = connection.data!.database;
      const migrations = await database.getAllAsync(
        'SELECT version FROM migrations ORDER BY applied_at ASC;'
      ) as { version: string }[];

      return {
        success: true,
        data: migrations.map(m => m.version)
      };
    } catch (error) {
      console.error('Failed to get applied migrations:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }
}
