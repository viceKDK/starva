# Database Schema

```sql
-- Runs table - stores all run data
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration INTEGER NOT NULL, -- seconds
    distance REAL NOT NULL, -- meters
    average_pace REAL NOT NULL, -- seconds per km
    route TEXT NOT NULL, -- JSON array of GPS points
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
);

-- Personal Records table - stores current PRs
CREATE TABLE personal_records (
    distance REAL PRIMARY KEY, -- meters (5000, 10000, etc.)
    best_time INTEGER NOT NULL, -- seconds
    run_id TEXT NOT NULL,
    achieved_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Indexes for performance
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);
CREATE INDEX idx_runs_distance ON runs(distance);
CREATE INDEX idx_personal_records_distance ON personal_records(distance);
```
