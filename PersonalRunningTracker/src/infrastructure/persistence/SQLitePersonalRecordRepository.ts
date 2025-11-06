import { PersonalRecord, PersonalRecordId, RecordCategory } from '@/domain/entities/PersonalRecord';
import { IPersonalRecordRepository } from '@/domain/repositories/IPersonalRecordRepository';
import { Result } from '@/shared/types';
import { DatabaseService } from './DatabaseService';

export class SQLitePersonalRecordRepository implements IPersonalRecordRepository {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  async save(record: PersonalRecord): Promise<Result<void, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      await conn.data!.database.runAsync(
        `INSERT OR REPLACE INTO personal_records
         (id, category, value, run_id, achieved_at, previous_value)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          record.id.value,
          record.category,
          record.value,
          record.runId.value,
          record.achievedAt.toISOString(),
          record.previousValue || null
        ]
      );
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Failed to save personal record:', error);
      return { success: false, error: `Failed to save personal record: ${error.message || String(error)}` };
    }
  }

  async findById(id: PersonalRecordId): Promise<Result<PersonalRecord | null, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const row: any = await conn.data!.database.getFirstAsync(
        'SELECT * FROM personal_records WHERE id = ?',
        [id.value]
      );
      if (!row) return { success: true, data: null };
      return { success: true, data: this.mapRowToPersonalRecord(row) };
    } catch (error: any) {
      console.error('Failed to find personal record by id:', error);
      return { success: false, error: `Failed to find personal record: ${error.message || String(error)}` };
    }
  }

  async findByCategory(category: RecordCategory): Promise<Result<PersonalRecord | null, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const row: any = await conn.data!.database.getFirstAsync(
        'SELECT * FROM personal_records WHERE category = ?',
        [category]
      );
      if (!row) return { success: true, data: null };
      return { success: true, data: this.mapRowToPersonalRecord(row) };
    } catch (error: any) {
      console.error('Failed to find personal record by category:', error);
      return { success: false, error: `Failed to find personal record: ${error.message || String(error)}` };
    }
  }

  async findAll(): Promise<Result<PersonalRecord[], string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      const rows: any[] = await conn.data!.database.getAllAsync(
        'SELECT * FROM personal_records ORDER BY achieved_at DESC'
      );
      const records = rows.map(row => this.mapRowToPersonalRecord(row));
      return { success: true, data: records };
    } catch (error: any) {
      console.error('Failed to find all personal records:', error);
      return { success: false, error: `Failed to find personal records: ${error.message || String(error)}` };
    }
  }

  async deleteById(id: PersonalRecordId): Promise<Result<void, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      await conn.data!.database.runAsync(
        'DELETE FROM personal_records WHERE id = ?',
        [id.value]
      );
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Failed to delete personal record:', error);
      return { success: false, error: `Failed to delete personal record: ${error.message || String(error)}` };
    }
  }

  async deleteAll(): Promise<Result<void, string>> {
    const conn = await this.databaseService.initialize();
    if (!conn.success) return { success: false, error: 'Failed to connect to database' };

    try {
      await conn.data!.database.runAsync('DELETE FROM personal_records');
      return { success: true, data: undefined };
    } catch (error: any) {
      console.error('Failed to delete all personal records:', error);
      return { success: false, error: `Failed to delete personal records: ${error.message || String(error)}` };
    }
  }

  private mapRowToPersonalRecord(row: any): PersonalRecord {
    return new PersonalRecord(
      { value: row.id },
      row.category as RecordCategory,
      row.value,
      { value: row.run_id },
      new Date(row.achieved_at),
      row.previous_value || undefined
    );
  }
}
