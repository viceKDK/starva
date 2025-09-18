# Backend Architecture

## Service Architecture

**No Backend Services Required** - This application uses a **local-first architecture** with all data processing and storage handled on the mobile device:

- **Data Processing:** All calculations (distance, pace, personal records) performed locally using JavaScript/TypeScript
- **Data Storage:** SQLite database managed directly through expo-sqlite
- **Business Logic:** Implemented as local services within the React Native application

## Database Architecture

### Schema Design

```sql
-- Primary runs table with optimized structure
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER NOT NULL, -- seconds
    distance REAL NOT NULL, -- meters
    average_pace REAL NOT NULL, -- seconds per km
    route TEXT NOT NULL, -- JSON stringified GPSPoint[]
    name TEXT NOT NULL DEFAULT 'Morning Run',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL
);

-- Personal records lookup table
CREATE TABLE personal_records (
    distance REAL PRIMARY KEY, -- Standard distances: 1000, 5000, 10000, 21097, 42195
    best_time INTEGER NOT NULL,
    run_id TEXT NOT NULL,
    achieved_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_runs_distance ON runs(distance);
CREATE INDEX idx_personal_records_distance ON personal_records(distance);
```

### Data Access Layer

```typescript
// Repository pattern for SQLite operations
export class RunRepository {
  private db: SQLite.WebSQLDatabase;

  constructor(database: SQLite.WebSQLDatabase) {
    this.db = database;
  }

  async saveRun(run: Run): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO runs (id, start_time, end_time, duration, distance, average_pace, route, name, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            run.id,
            run.startTime.toISOString(),
            run.endTime.toISOString(),
            run.duration,
            run.distance,
            run.averagePace,
            JSON.stringify(run.route),
            run.name,
            run.notes || '',
            run.createdAt.toISOString()
          ],
          () => resolve(),
          (_, error) => { reject(error); return false; }
        );
      });
    });
  }

  async getAllRuns(): Promise<Run[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM runs ORDER BY created_at DESC',
          [],
          (_, { rows: { _array } }) => {
            const runs = _array.map(row => ({
              ...row,
              startTime: new Date(row.start_time),
              endTime: new Date(row.end_time),
              route: JSON.parse(row.route),
              createdAt: new Date(row.created_at)
            }));
            resolve(runs);
          },
          (_, error) => { reject(error); return false; }
        );
      });
    });
  }
}
```

## Authentication and Authorization

**No Authentication Required** - Single-user local application with no user accounts or multi-user functionality:

- **Device Security:** Relies on iOS device lock screen and biometric security
- **Data Privacy:** All data remains local to device, no external access points
- **App Security:** Standard iOS app sandbox security model
