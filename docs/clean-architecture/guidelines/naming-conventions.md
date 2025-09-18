# Naming Conventions - Intention Revealing & Descriptive

## Core Principles

### Intention-Revealing Names
Names should clearly express **WHY** something exists, **WHAT** it does, and **HOW** it's used without requiring comments.

### Avoid Vague Naming
Never use generic names like `data`, `info`, `manager`, `handler`, `utils`, or `helper`.

### Searchable and Pronounceable
Names should be easy to search for in code and easy to discuss in conversations.

## TypeScript/React Native Specific Conventions

### Variables and Functions

#### ✅ Good Examples - Intention Revealing
```typescript
// GOOD: Clear purpose and type
const userLocationCoordinates = { lat: 40.7128, lng: -74.0060 };
const runTrackingStartTime = new Date();
const gpsPointsCollectedDuringRun: GPSPoint[] = [];
const isUserLocationPermissionGranted = true;

// GOOD: Action-oriented function names
function calculateDistanceBetweenGPSPoints(point1: GPSPoint, point2: GPSPoint): Distance {}
function validateRunHasMinimumRequiredDuration(run: Run): boolean {}
function formatPaceAsMinutesPerKilometer(pace: Pace): string {}
function persistRunDataToLocalDatabase(run: Run): Promise<Result<void, string>> {}

// GOOD: Boolean names that read like questions
const isRunCurrentlyInProgress = trackingSession.isActive();
const hasUserGrantedLocationPermission = await checkLocationPermission();
const doesRunMeetMinimumDistanceRequirement = run.distance > MIN_DISTANCE;
const canUserStartNewRunTrackingSession = !isCurrentlyTracking;
```

#### ❌ Bad Examples - Vague Naming
```typescript
// BAD: Generic, unclear names
const data = { lat: 40.7128, lng: -74.0060 };        // What kind of data?
const info = new Date();                              // What information?
const items: GPSPoint[] = [];                         // What items?
const flag = true;                                    // What does this flag represent?

// BAD: Unclear function purposes
function process(a: GPSPoint, b: GPSPoint): number {} // Process what? Return what?
function handle(run: Run): boolean {}                 // Handle what? How?
function get(pace: Pace): string {}                   // Get what from pace?
function save(run: Run): Promise<any> {}              // Save where? Return what?

// BAD: Unclear boolean names
const check = trackingSession.isActive();             // Check what?
const result = await checkLocationPermission();       // What result?
const valid = run.distance > MIN_DISTANCE;            // Valid for what?
const enabled = !isCurrentlyTracking;                 // What is enabled?
```

### Classes and Interfaces

#### ✅ Good Examples - Descriptive Classes
```typescript
// GOOD: Clear responsibility and purpose
class GPSLocationTrackingService implements IGPSLocationService {
  async startContinuousLocationTracking(): Promise<Result<void, GPSError>> {}
  async stopLocationTrackingAndReturnCollectedPoints(): Promise<Result<GPSPoint[], GPSError>> {}
}

class RunDistanceCalculationService implements IRunCalculationService {
  calculateTotalDistanceFromGPSPoints(points: GPSPoint[]): Distance {}
  calculateAveragePaceBetweenTwoLocations(start: GPSPoint, end: GPSPoint): Pace {}
}

class SQLiteRunPersistenceRepository implements IRunRepository {
  saveRunWithGPSPointsToLocalDatabase(run: Run): Promise<Result<void, DatabaseError>> {}
  findAllRunsSortedByDateDescending(): Promise<Result<Run[], DatabaseError>> {}
}

class PersonalRecordCalculationEngine {
  determineIfRunAchievesNewPersonalRecord(run: Run, existingRecords: PersonalRecord[]): boolean {}
  updatePersonalRecordsWithNewRunData(run: Run): PersonalRecord[] {}
}

// GOOD: Interface names that describe capability
interface IGPSLocationTrackingCapability {
  startTracking(): Promise<Result<void, GPSError>>;
  stopTracking(): Promise<Result<GPSPoint[], GPSError>>;
  getCurrentLocation(): Promise<Result<GPSPoint, GPSError>>;
}

interface IRunDataPersistenceCapability {
  save(run: Run): Promise<Result<void, DatabaseError>>;
  findById(id: RunId): Promise<Result<Run, DatabaseError>>;
  findAll(): Promise<Result<Run[], DatabaseError>>;
}
```

#### ❌ Bad Examples - Vague Classes
```typescript
// BAD: Generic, unclear responsibilities
class GPSService {}                    // Service for what GPS operations?
class RunManager {}                    // Manages what aspects of runs?
class DataHandler {}                   // Handles what data? How?
class Helper {}                        // Helps with what?
class Utils {}                         // Utilities for what?

class LocationService {}               // What location operations?
class DatabaseService {}               // What database operations?
class CalculationService {}            // Calculates what?

// BAD: Unclear interface purposes
interface IService {}                  // What service capability?
interface IManager {}                  // What management capability?
interface IHandler {}                  // What handling capability?
interface IProvider {}                 // Provides what?
```

### React Components

#### ✅ Good Examples - Component Purpose Clear
```typescript
// GOOD: Component purpose is immediately clear
export const ActiveRunTrackingDisplay: React.FC<ActiveRunTrackingDisplayProps> = ({
  currentRunSession,
  elapsedTimeInSeconds,
  distanceCoveredInMeters,
  currentPaceInMinutesPerKilometer
}) => {
  return (
    <View>
      <RunningTimeDisplay seconds={elapsedTimeInSeconds} />
      <DistanceCoveredDisplay meters={distanceCoveredInMeters} />
      <CurrentPaceDisplay pace={currentPaceInMinutesPerKilometer} />
    </View>
  );
};

export const RunHistoryListWithSearchAndFilter: React.FC = () => {
  const [searchQueryForRunName, setSearchQueryForRunName] = useState('');
  const [selectedDateRangeFilter, setSelectedDateRangeFilter] = useState<DateRange | null>(null);

  return (
    <View>
      <RunSearchInput
        query={searchQueryForRunName}
        onQueryChange={setSearchQueryForRunName}
      />
      <DateRangeFilterPicker
        selectedRange={selectedDateRangeFilter}
        onRangeChange={setSelectedDateRangeFilter}
      />
      <RunListDisplayGrid runs={filteredRuns} />
    </View>
  );
};

export const RunDetailMapWithRouteVisualization: React.FC<RunDetailMapProps> = ({
  runWithGPSRoute,
  shouldShowElevationProfile,
  onMapInteraction
}) => {
  return (
    <MapView>
      <RunRoutePolyline gpsPoints={runWithGPSRoute.gpsPoints} />
      {shouldShowElevationProfile && (
        <ElevationProfileOverlay elevationData={runWithGPSRoute.elevationData} />
      )}
    </MapView>
  );
};
```

#### ❌ Bad Examples - Unclear Component Purpose
```typescript
// BAD: Generic component names
export const Display: React.FC = () => {};           // Displays what?
export const Container: React.FC = () => {};         // Contains what?
export const Wrapper: React.FC = () => {};          // Wraps what?
export const Component: React.FC = () => {};        // What component?

export const RunComponent: React.FC = () => {};     // What aspect of runs?
export const DataList: React.FC = () => {};         // What data?
export const InfoCard: React.FC = () => {};         // What information?
export const ItemView: React.FC = () => {};         // What items?
```

### Hooks (Custom)

#### ✅ Good Examples - Hook Purpose Clear
```typescript
// GOOD: Hook responsibility is clear from name
export const useRunTrackingWithGPSLocationCapture = () => {
  const [isCurrentlyTrackingRunInProgress, setIsCurrentlyTrackingRunInProgress] = useState(false);
  const [gpsPointsCollectedDuringCurrentRun, setGpsPointsCollectedDuringCurrentRun] = useState<GPSPoint[]>([]);
  const [runTrackingError, setRunTrackingError] = useState<string | null>(null);

  const startNewRunTrackingSession = async (): Promise<void> => {
    // Implementation
  };

  const stopCurrentRunTrackingAndSaveData = async (): Promise<void> => {
    // Implementation
  };

  return {
    isCurrentlyTrackingRunInProgress,
    gpsPointsCollectedDuringCurrentRun,
    runTrackingError,
    startNewRunTrackingSession,
    stopCurrentRunTrackingAndSaveData
  };
};

export const usePersonalRecordsCalculationAndDisplay = () => {
  const [personalRecordsForAllDistances, setPersonalRecordsForAllDistances] = useState<PersonalRecord[]>([]);
  const [isCalculatingPersonalRecords, setIsCalculatingPersonalRecords] = useState(false);

  const recalculatePersonalRecordsFromAllRuns = async (): Promise<void> => {
    // Implementation
  };

  return {
    personalRecordsForAllDistances,
    isCalculatingPersonalRecords,
    recalculatePersonalRecordsFromAllRuns
  };
};

export const useRunHistoryWithSearchAndPagination = () => {
  const [allRunsFromDatabase, setAllRunsFromDatabase] = useState<Run[]>([]);
  const [filteredRunsBasedOnSearchCriteria, setFilteredRunsBasedOnSearchCriteria] = useState<Run[]>([]);
  const [currentPageNumberForPagination, setCurrentPageNumberForPagination] = useState(1);
  const [searchQueryForRunFiltering, setSearchQueryForRunFiltering] = useState('');

  const searchRunsByNameOrDate = (query: string): void => {
    // Implementation
  };

  const loadNextPageOfRuns = async (): Promise<void> => {
    // Implementation
  };

  return {
    filteredRunsBasedOnSearchCriteria,
    currentPageNumberForPagination,
    searchQueryForRunFiltering,
    searchRunsByNameOrDate,
    loadNextPageOfRuns
  };
};
```

#### ❌ Bad Examples - Unclear Hook Purpose
```typescript
// BAD: Generic hook names
export const useData = () => {};                     // What data?
export const useService = () => {};                  // What service?
export const useManager = () => {};                  // What manager?
export const useHandler = () => {};                  // What handler?

export const useRun = () => {};                      // What run operations?
export const useGPS = () => {};                      // What GPS operations?
export const useDB = () => {};                       // What database operations?
```

### Constants and Enums

#### ✅ Good Examples - Clear Purpose
```typescript
// GOOD: Constants with clear purpose and context
export const GPS_TRACKING_ACCURACY_BEST_FOR_NAVIGATION = Location.Accuracy.BestForNavigation;
export const MINIMUM_RUN_DURATION_IN_SECONDS = 60;
export const MINIMUM_RUN_DISTANCE_IN_METERS = 100;
export const MAXIMUM_GPS_POINT_ACCURACY_ERROR_IN_METERS = 10;
export const DEFAULT_RUN_NAME_WHEN_USER_DOES_NOT_PROVIDE_ONE = 'Morning Run';

export const DATABASE_TABLE_NAMES = {
  RUNS_WITH_GPS_DATA: 'runs',
  GPS_POINTS_FOR_ROUTES: 'gps_points',
  PERSONAL_RECORDS_BY_DISTANCE: 'personal_records'
} as const;

export const GPS_LOCATION_UPDATE_INTERVALS = {
  TIME_INTERVAL_IN_MILLISECONDS: 1000,
  DISTANCE_INTERVAL_IN_METERS: 5,
  TIMEOUT_IN_MILLISECONDS: 10000
} as const;

// GOOD: Enum with clear values and purpose
export enum RunTrackingSessionStatus {
  NOT_STARTED = 'NOT_STARTED',
  CURRENTLY_TRACKING_GPS_POINTS = 'CURRENTLY_TRACKING_GPS_POINTS',
  TEMPORARILY_PAUSED_BY_USER = 'TEMPORARILY_PAUSED_BY_USER',
  COMPLETED_AND_READY_TO_SAVE = 'COMPLETED_AND_READY_TO_SAVE',
  STOPPED_DUE_TO_ERROR = 'STOPPED_DUE_TO_ERROR'
}

export enum PersonalRecordDistanceCategory {
  ONE_KILOMETER = 1000,
  FIVE_KILOMETERS = 5000,
  TEN_KILOMETERS = 10000,
  HALF_MARATHON = 21097,
  FULL_MARATHON = 42195
}
```

#### ❌ Bad Examples - Unclear Purpose
```typescript
// BAD: Generic constant names
export const ACCURACY = Location.Accuracy.BestForNavigation;  // Accuracy for what?
export const MIN_TIME = 60;                                   // Minimum time for what?
export const DISTANCE = 100;                                  // What distance?
export const ERROR = 10;                                      // What error?
export const DEFAULT_NAME = 'Morning Run';                    // Default name for what?

export const TABLES = {                                       // Tables for what?
  RUNS: 'runs',
  POINTS: 'gps_points',
  RECORDS: 'personal_records'
} as const;

// BAD: Unclear enum purpose
export enum Status {                                          // Status of what?
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  DONE = 'DONE'
}
```

### Error Types and Messages

#### ✅ Good Examples - Specific Error Context
```typescript
// GOOD: Specific error types with clear context
export class GPSLocationPermissionDeniedError extends Error {
  constructor() {
    super('User denied permission to access device location for GPS tracking');
    this.name = 'GPSLocationPermissionDeniedError';
  }
}

export class RunValidationMinimumDurationNotMetError extends Error {
  constructor(actualDurationInSeconds: number, minimumRequiredInSeconds: number) {
    super(`Run duration ${actualDurationInSeconds}s does not meet minimum requirement of ${minimumRequiredInSeconds}s`);
    this.name = 'RunValidationMinimumDurationNotMetError';
  }
}

export class SQLiteDatabaseConnectionFailedError extends Error {
  constructor(databasePath: string, originalError: Error) {
    super(`Failed to connect to SQLite database at ${databasePath}: ${originalError.message}`);
    this.name = 'SQLiteDatabaseConnectionFailedError';
  }
}

// GOOD: Error result types that are specific
export type GPSTrackingError =
  | 'GPS_LOCATION_PERMISSION_DENIED_BY_USER'
  | 'GPS_DEVICE_DISABLED_IN_SYSTEM_SETTINGS'
  | 'GPS_SIGNAL_UNAVAILABLE_TIMEOUT_EXCEEDED'
  | 'GPS_ACCURACY_INSUFFICIENT_FOR_TRACKING';

export type RunPersistenceError =
  | 'DATABASE_CONNECTION_FAILED'
  | 'RUN_DATA_VALIDATION_FAILED'
  | 'DISK_SPACE_INSUFFICIENT_FOR_SAVE'
  | 'RUN_WITH_ID_ALREADY_EXISTS';
```

#### ❌ Bad Examples - Generic Error Context
```typescript
// BAD: Generic error names
export class GPSError extends Error {}                        // What GPS error?
export class ValidationError extends Error {}                 // Validation of what?
export class DatabaseError extends Error {}                   // What database error?
export class ServiceError extends Error {}                    // What service error?

// BAD: Unclear error types
export type GPSError = 'ERROR' | 'FAILED' | 'DENIED';        // Too generic
export type DatabaseError = 'ERROR' | 'NOT_FOUND';           // What type of error?
```

### Test File Naming

#### ✅ Good Examples - Test Purpose Clear
```typescript
// GOOD: Test file names that describe what's being tested
// RunDistanceCalculationService.test.ts
describe('RunDistanceCalculationService', () => {
  describe('calculateTotalDistanceFromGPSPoints', () => {
    it('should return zero distance when given empty GPS points array', () => {});
    it('should calculate correct distance between two GPS points using haversine formula', () => {});
    it('should handle GPS points with varying accuracy levels correctly', () => {});
  });
});

// GPSLocationTrackingService.integration.test.ts
describe('GPSLocationTrackingService Integration Tests', () => {
  describe('when user grants location permission', () => {
    it('should successfully start tracking and collect GPS points', () => {});
  });

  describe('when user denies location permission', () => {
    it('should return permission denied error without crashing', () => {});
  });
});

// RunTrackingScreen.component.test.tsx
describe('RunTrackingScreen Component', () => {
  describe('when user is not currently tracking a run', () => {
    it('should display start run button and hide tracking controls', () => {});
  });

  describe('when user is actively tracking a run', () => {
    it('should display real-time metrics and stop/pause controls', () => {});
  });
});
```

#### ❌ Bad Examples - Unclear Test Purpose
```typescript
// BAD: Generic test names
// service.test.ts                                            // Which service?
// component.test.tsx                                         // Which component?
// utils.test.ts                                             // Which utilities?

describe('Tests', () => {                                     // Tests for what?
  it('should work', () => {});                               // What should work?
  it('should be valid', () => {});                           // What should be valid?
  it('should handle error', () => {});                       // What error?
});
```

## Domain-Specific Naming Patterns

### Running/GPS Domain Vocabulary

#### ✅ Preferred Domain Terms
```typescript
// Use specific running terminology
const runningSession = new RunTrackingSession();
const gpsRoute = new GPSRoute();
const paceInMinutesPerKilometer = new Pace();
const elevationGainInMeters = calculateElevationGain();
const personalRecordForFiveKilometers = new PersonalRecord();

// Use GPS/location specific terms
const coordinatesLatitudeLongitude = new Coordinates();
const accuracyRadiusInMeters = location.accuracy;
const altitudeAboveSeaLevelInMeters = location.altitude;
const bearingInDegrees = location.bearing;
```

#### ❌ Avoid Generic Terms
```typescript
// Avoid generic terms when domain-specific ones exist
const session = new Session();                               // Use RunTrackingSession
const route = new Route();                                   // Use GPSRoute
const speed = new Speed();                                   // Use Pace for running
const record = new Record();                                 // Use PersonalRecord
const location = new Location();                             // Use GPSPoint or Coordinates
```

## Summary Rules

### Do's ✅
1. **Use intention-revealing names** that explain purpose
2. **Be specific** rather than generic
3. **Use domain vocabulary** when available
4. **Make names searchable** and pronounceable
5. **Use consistent patterns** across similar concepts
6. **Include units** in names when dealing with measurements
7. **Use action verbs** for functions that perform actions
8. **Use questions** for boolean variables/functions

### Don'ts ❌
1. **Never use** `data`, `info`, `item`, `thing`, `stuff`
2. **Avoid abbreviations** unless they're domain standard
3. **Don't use** `manager`, `handler`, `processor`, `service` without context
4. **Avoid numbers** in names unless they have meaning
5. **Don't use** misleading names
6. **Avoid mental mapping** - names should be self-explanatory
7. **Don't use** humor or inside jokes in production code
8. **Avoid noise words** like `the`, `data`, `info`

---

*Clear, intention-revealing naming makes our React Native codebase self-documenting and maintainable, reducing the need for comments and making the code more professional.*