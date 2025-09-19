import { PersonalRecord, PersonalRecordId, RecordCategory } from '../entities/PersonalRecord';
import { Result } from '@/shared/types';

export interface IPersonalRecordRepository {
  save(record: PersonalRecord): Promise<Result<void, string>>;
  findById(id: PersonalRecordId): Promise<Result<PersonalRecord | null, string>>;
  findByCategory(category: RecordCategory): Promise<Result<PersonalRecord | null, string>>;
  findAll(): Promise<Result<PersonalRecord[], string>>;
  deleteById(id: PersonalRecordId): Promise<Result<void, string>>;
  deleteAll(): Promise<Result<void, string>>;
}