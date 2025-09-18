# Data Models

## Run Model

**Purpose:** Core entity representing a single running session with GPS tracking data, metrics, and metadata

**Key Attributes:**
- id: string (UUID) - Unique identifier for the run
- startTime: Date - When the run began
- endTime: Date - When the run finished
- duration: number - Total run time in seconds
- distance: number - Total distance in meters
- averagePace: number - Average pace in seconds per kilometer
- route: GPSPoint[] - Array of GPS coordinates
- name: string - User-defined name for the run
- notes: string - Optional notes about the run
- createdAt: Date - Record creation timestamp

### TypeScript Interface

```typescript
interface Run {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  distance: number; // meters
  averagePace: number; // seconds per km
  route: GPSPoint[];
  name: string;
  notes?: string;
  createdAt: Date;
}

interface GPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: Date;
  accuracy?: number;
}
```

### Relationships
- Has many GPSPoints (embedded within route array)
- Aggregated into PersonalRecords calculations

## PersonalRecord Model

**Purpose:** Tracks personal best performances for different distances

**Key Attributes:**
- distance: number - Distance in meters (e.g., 5000 for 5K)
- bestTime: number - Best time in seconds for this distance
- runId: string - Reference to the run that achieved this record
- achievedAt: Date - When this record was set

### TypeScript Interface

```typescript
interface PersonalRecord {
  distance: number; // meters
  bestTime: number; // seconds
  runId: string;
  achievedAt: Date;
}
```

### Relationships
- References Run entity via runId
- Calculated/updated when new runs are completed
