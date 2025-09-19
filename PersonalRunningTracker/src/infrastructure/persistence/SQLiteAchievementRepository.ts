import * as SQLite from 'expo-sqlite';
import { Achievement, AchievementId, AchievementType, AchievementCriteria } from '@/domain/entities/Achievement';
import { IAchievementRepository } from '@/domain/repositories/IAchievementRepository';
import { Result } from '@/shared/types';
import { DatabaseService } from './DatabaseService';

export class SQLiteAchievementRepository implements IAchievementRepository {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  async save(achievement: Achievement): Promise<Result<void, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      await conn.data!.database.runAsync(
        `INSERT OR REPLACE INTO achievements
         (id, type, title, description, criteria, earned_at, run_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          achievement.id.value,
          achievement.type,
          achievement.title,
          achievement.description,
          JSON.stringify(achievement.criteria),
          achievement.earnedAt?.toISOString() || null,
          achievement.runId?.value || null
        ]
      );
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Failed to save achievement:', error);
      return { success: false, error: `Failed to save achievement: ${error.message || String(error)}` };
    }
  }

  async findById(id: AchievementId): Promise<Result<Achievement | null, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const row: any = await conn.data!.database.getFirstAsync(
        'SELECT * FROM achievements WHERE id = ?',
        [id.value]
      );
      if (!row) return { success: true, data: null };
      return { success: true, data: this.mapRowToAchievement(row) };
    } catch (error: any) {
      console.error('Failed to find achievement by id:', error);
      return { success: false, error: `Failed to find achievement: ${error.message || String(error)}` };
    }
  }

  async findByType(type: AchievementType): Promise<Result<Achievement[], string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const rows: any[] = await conn.data!.database.getAllAsync(
        'SELECT * FROM achievements WHERE type = ? ORDER BY earned_at DESC',
        [type]
      );
      return { success: true, data: rows.map(r => this.mapRowToAchievement(r)) };
    } catch (error: any) {
      console.error('Failed to find achievements by type:', error);
      return { success: false, error: `Failed to find achievements: ${error.message || String(error)}` };
    }
  }

  async findByTypeAndCriteria(type: AchievementType, criteria: AchievementCriteria): Promise<Result<Achievement | null, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const row: any = await conn.data!.database.getFirstAsync(
        'SELECT * FROM achievements WHERE type = ? AND criteria = ?',
        [type, JSON.stringify(criteria)]
      );
      if (!row) return { success: true, data: null };
      return { success: true, data: this.mapRowToAchievement(row) };
    } catch (error: any) {
      console.error('Failed to find achievement by type and criteria:', error);
      return { success: false, error: `Failed to find achievement: ${error.message || String(error)}` };
    }
  }

  async findAll(): Promise<Result<Achievement[], string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const rows: any[] = await conn.data!.database.getAllAsync(
        'SELECT * FROM achievements ORDER BY earned_at DESC, created_at DESC'
      );
      return { success: true, data: rows.map(r => this.mapRowToAchievement(r)) };
    } catch (error: any) {
      console.error('Failed to find all achievements:', error);
      return { success: false, error: `Failed to find achievements: ${error.message || String(error)}` };
    }
  }

  async findEarnedAchievements(): Promise<Result<Achievement[], string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const rows: any[] = await conn.data!.database.getAllAsync(
        'SELECT * FROM achievements WHERE earned_at IS NOT NULL ORDER BY earned_at DESC'
      );
      return { success: true, data: rows.map(r => this.mapRowToAchievement(r)) };
    } catch (error: any) {
      console.error('Failed to find earned achievements:', error);
      return { success: false, error: `Failed to find achievements: ${error.message || String(error)}` };
    }
  }

  async deleteById(id: AchievementId): Promise<Result<void, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      await conn.data!.database.runAsync(
        'DELETE FROM achievements WHERE id = ?',
        [id.value]
      );
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Failed to delete achievement:', error);
      return { success: false, error: `Failed to delete achievement: ${error.message || String(error)}` };
    }
  }

  async deleteAll(): Promise<Result<void, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      await conn.data!.database.runAsync('DELETE FROM achievements');
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Failed to delete all achievements:', error);
      return { success: false, error: `Failed to delete achievements: ${error.message || String(error)}` };
    }
  }

  private mapRowToAchievement(row: any): Achievement {
    const criteria: AchievementCriteria = JSON.parse(row.criteria);
    const earnedAt = row.earned_at ? new Date(row.earned_at) : undefined;
    const runId = row.run_id ? { value: row.run_id } : undefined;

    return new Achievement(
      { value: row.id },
      row.type as AchievementType,
      row.title,
      row.description,
      criteria,
      earnedAt,
      runId
    );
  }
}
