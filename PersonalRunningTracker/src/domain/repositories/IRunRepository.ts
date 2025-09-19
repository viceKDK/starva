// Run repository interface
import { Run } from '../entities';

export type DatabaseError =
  | 'CONNECTION_FAILED'
  | 'SAVE_FAILED'
  | 'NOT_FOUND'
  | 'DELETE_FAILED'
  | 'QUERY_FAILED'
  | 'VALIDATION_FAILED'
  | 'MIGRATION_FAILED';

export interface Result<T, E> {
  success: boolean;
  data?: T;
  error?: E;
}

export type RunId = string;

export interface IRunRepository {
  save(run: Run): Promise<Result<void, DatabaseError>>;
  findById(id: RunId): Promise<Result<Run, DatabaseError>>;
  findAll(): Promise<Result<Run[], DatabaseError>>;
  delete(id: RunId): Promise<Result<void, DatabaseError>>;
  update(id: RunId, updates: Partial<Run>): Promise<Result<void, DatabaseError>>;
}