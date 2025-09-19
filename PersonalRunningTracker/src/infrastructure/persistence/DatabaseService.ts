import * as SQLite from 'expo-sqlite';

export interface DatabaseConnection {
  database: SQLite.SQLiteDatabase;
  isConnected: boolean;
}

export type DatabaseError =
  | 'CONNECTION_FAILED'
  | 'SAVE_FAILED'
  | 'NOT_FOUND'
  | 'DELETE_FAILED'
  | 'QUERY_FAILED'
  | 'MIGRATION_FAILED';

export interface Result<T, E> {
  success: boolean;
  data?: T;
  error?: E;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private connection: DatabaseConnection | null = null;
  private readonly databaseName = 'running_tracker.db';

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<Result<DatabaseConnection, DatabaseError>> {
    try {
      if (this.connection?.isConnected) {
        return { success: true, data: this.connection };
      }

      const database = await SQLite.openDatabaseAsync(this.databaseName);

      if (!database) {
        return { success: false, error: 'CONNECTION_FAILED' };
      }

      this.connection = {
        database,
        isConnected: true
      };

      // Enable foreign keys and WAL mode for better performance
      await database.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 10000;
        PRAGMA temp_store = MEMORY;
      `);

      // Ensure base schema exists (idempotent)
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          distance REAL NOT NULL,
          duration INTEGER NOT NULL,
          average_pace REAL NOT NULL,
          route_data TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT 'Morning Run',
          notes TEXT DEFAULT '',
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_runs_distance ON runs(distance);
        CREATE INDEX IF NOT EXISTS idx_runs_duration ON runs(duration);

        CREATE TABLE IF NOT EXISTS personal_records (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          value REAL NOT NULL,
          run_id TEXT NOT NULL,
          achieved_at TEXT NOT NULL,
          previous_value REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category)
        );
        CREATE INDEX IF NOT EXISTS idx_personal_records_category ON personal_records(category);

        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          criteria TEXT NOT NULL,
          earned_at TEXT,
          run_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);
        CREATE INDEX IF NOT EXISTS idx_achievements_earned ON achievements(earned_at);
      `);

      return { success: true, data: this.connection };
    } catch (error) {
      console.error('Database initialization failed:', error);
      return { success: false, error: 'CONNECTION_FAILED' };
    }
  }

  public getConnection(): DatabaseConnection | null {
    return this.connection;
  }

  public async close(): Promise<Result<void, DatabaseError>> {
    try {
      if (this.connection?.database) {
        await this.connection.database.closeAsync();
        this.connection.isConnected = false;
        this.connection = null;
      }
      return { success: true };
    } catch (error) {
      console.error('Database close failed:', error);
      return { success: false, error: 'CONNECTION_FAILED' };
    }
  }

  public async executeTransaction<T>(
    operations: (db: SQLite.SQLiteDatabase) => Promise<T>
  ): Promise<Result<T, DatabaseError>> {
    if (!this.connection?.isConnected) {
      return { success: false, error: 'CONNECTION_FAILED' };
    }

    try {
      let result: T;
      await this.connection.database.withTransactionAsync(async () => {
        result = await operations(this.connection!.database);
      });

      return { success: true, data: result! };
    } catch (error) {
      console.error('Transaction failed:', error);
      return { success: false, error: 'QUERY_FAILED' };
    }
  }
}
