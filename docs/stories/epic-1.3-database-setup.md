# Story 1.3: Local Database Setup and Schema Creation

**Epic**: Foundation & GPS Core Infrastructure
**Story ID**: 1.3
**Priority**: Must Have
**Estimated Effort**: 4-6 hours

## User Story

As a developer,
I want to set up SQLite database with proper schema for storing run data,
so that user runs can be persisted locally on the device.

## Acceptance Criteria

### 1. Database Initialization
- [ ] SQLite database initialized using expo-sqlite
- [ ] Database connection established with proper error handling
- [ ] Database file created in appropriate iOS app directory
- [ ] Connection pooling implemented for performance

### 2. Schema Definition
- [ ] `runs` table created with all required fields:
  - id (TEXT PRIMARY KEY)
  - start_time (TEXT - ISO timestamp)
  - end_time (TEXT - ISO timestamp)
  - distance (REAL - meters)
  - duration (INTEGER - seconds)
  - average_pace (REAL - seconds per km)
  - route_data (TEXT - JSON GPS points)
  - name (TEXT)
  - notes (TEXT)
  - created_at (TEXT - ISO timestamp)

### 3. Database Migration System
- [ ] Migration system implemented for future schema changes
- [ ] Version tracking table created for migration management
- [ ] Initial migration script creates base schema
- [ ] Migration rollback capability for development

### 4. Repository Pattern Implementation
- [ ] IRunRepository interface defined with CRUD operations
- [ ] SQLiteRunRepository implements IRunRepository
- [ ] Repository methods: save(), findById(), findAll(), delete(), update()
- [ ] Result Pattern used for all database operations (no exceptions)

### 5. Data Access Layer
- [ ] Database operations wrapped in transactions for consistency
- [ ] Prepared statements used for SQL injection prevention
- [ ] Connection management with proper cleanup
- [ ] Error handling for database corruption and disk space issues

### 6. Performance Optimization
- [ ] Indexes created on frequently queried columns (created_at, distance)
- [ ] Query optimization for large datasets (1000+ runs)
- [ ] Lazy loading implemented for GPS route data
- [ ] Database operations complete within 500ms requirement

### 7. Data Validation and Integrity
- [ ] Database constraints ensure data integrity
- [ ] JSON validation for route_data field
- [ ] Foreign key constraints where applicable
- [ ] Data type validation before database insertion

### 8. Testing Implementation
- [ ] Unit tests for all repository methods
- [ ] Integration tests with test database
- [ ] Performance testing with large datasets
- [ ] Data corruption recovery testing
- [ ] Migration testing (up and down migrations)

## Database Schema

```sql
-- Runs table - stores all run data
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    distance REAL NOT NULL, -- meters
    duration INTEGER NOT NULL, -- seconds
    average_pace REAL NOT NULL, -- seconds per km
    route_data TEXT NOT NULL, -- JSON array of GPS points
    name TEXT NOT NULL DEFAULT 'Morning Run',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_runs_distance ON runs(distance);

-- Migration tracking table
CREATE TABLE migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL
);
```

## Repository Interface

```typescript
// src/domain/repositories/IRunRepository.ts
export interface IRunRepository {
  save(run: Run): Promise<Result<void, DatabaseError>>;
  findById(id: RunId): Promise<Result<Run, DatabaseError>>;
  findAll(): Promise<Result<Run[], DatabaseError>>;
  delete(id: RunId): Promise<Result<void, DatabaseError>>;
  update(id: RunId, updates: Partial<Run>): Promise<Result<void, DatabaseError>>;
}

export type DatabaseError =
  | 'CONNECTION_FAILED'
  | 'SAVE_FAILED'
  | 'NOT_FOUND'
  | 'DELETE_FAILED'
  | 'QUERY_FAILED';
```

## Implementation Structure

```typescript
// src/infrastructure/persistence/SQLiteRunRepository.ts
export class SQLiteRunRepository implements IRunRepository {
  constructor(private database: SQLiteDatabase) {}

  async save(run: Run): Promise<Result<void, DatabaseError>> {
    // Transaction-based save operation
  }

  async findAll(): Promise<Result<Run[], DatabaseError>> {
    // Optimized query with pagination support
  }
}
```

## Definition of Done

- [ ] Database successfully initializes on app startup
- [ ] All CRUD operations work correctly with test data
- [ ] Repository integrates with dependency injection container
- [ ] Database handles 1000+ runs without performance degradation
- [ ] All database operations complete within 500ms
- [ ] Migration system supports schema evolution
- [ ] Unit tests achieve 90%+ coverage
- [ ] Integration tests validate real database operations

## Technical Notes

- Use expo-sqlite native module for optimal performance
- Store GPS route data as JSON for flexibility
- Implement proper database backup and recovery mechanisms
- Consider database encryption for sensitive data

## Dependencies

- **Prerequisite**: Story 1.1 (Project Setup) must be completed
- **External**: expo-sqlite package properly configured
- **Related**: Story 1.2 (GPS Service) provides GPSPoint data structure

## Risks

- Database corruption on device storage issues
- Performance degradation with large GPS datasets
- iOS app sandbox limitations on database access
- Migration complexity for future schema changes