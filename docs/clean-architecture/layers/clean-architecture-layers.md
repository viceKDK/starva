# Clean Architecture Layers for React Native

## Overview

Our React Native app follows Clean Architecture principles with clear separation of concerns across distinct layers. Each layer has specific responsibilities and dependency rules.

## Architecture Layers Structure

```
┌─────────────────────────────────────────────────────┐
│                 Presentation Layer                  │
│  React Components, Screens, Hooks, Navigation     │
│           (UI Framework Dependent)                  │
├─────────────────────────────────────────────────────┤
│                Application Layer                    │
│   Use Cases, Controllers, View Models              │
│          (Framework Independent)                    │
├─────────────────────────────────────────────────────┤
│                  Domain Layer                       │
│   Entities, Value Objects, Business Rules          │
│          (Pure Business Logic)                      │
├─────────────────────────────────────────────────────┤
│               Infrastructure Layer                  │
│  Database, GPS, File System, External APIs         │
│         (Framework/Technology Dependent)            │
└─────────────────────────────────────────────────────┘
```

## Dependency Rule

**Dependencies always point inward and downward:**
- Presentation → Application → Domain
- Infrastructure → Application → Domain
- **Never**: Domain → Infrastructure
- **Never**: Domain → Presentation

## Layer Details

### 1. Domain Layer (Core)

**Purpose**: Pure business logic without external dependencies

**Contains**:
- Entities (Run, GPSPoint, PersonalRecord)
- Value Objects (Distance, Duration, Pace)
- Domain Services (RunCalculationService)
- Repository Interfaces
- Business Rules and Invariants

**Dependencies**: None (pure TypeScript)

#### Example Domain Entities

```typescript
// src/domain/entities/Run.ts
export class Run {
  private constructor(
    private readonly id: RunId,
    private readonly startTime: Date,
    private readonly endTime: Date,
    private readonly gpsPoints: GPSPoint[],
    private readonly name: string
  ) {
    this.validateBusinessRules();
  }

  static create(props: RunCreationProps): Result<Run, string> {
    // Factory method with validation
    if (props.gpsPoints.length < 2) {
      return Result.failure('Run must have at least 2 GPS points');
    }

    const run = new Run(
      RunId.generate(),
      props.startTime,
      props.endTime,
      props.gpsPoints,
      props.name || 'Morning Run'
    );

    return Result.success(run);
  }

  // Domain logic - belongs to the entity
  calculateTotalDistance(): Distance {
    return this.gpsPoints.reduce((total, point, index) => {
      if (index === 0) return Distance.zero();

      const previous = this.gpsPoints[index - 1];
      const segmentDistance = DistanceCalculator.haversine(previous, point);
      return total.add(segmentDistance);
    }, Distance.zero());
  }

  calculateAveragePace(): Pace {
    const distance = this.calculateTotalDistance();
    const duration = this.getDuration();
    return Pace.fromDistanceAndDuration(distance, duration);
  }

  getDuration(): Duration {
    return Duration.between(this.startTime, this.endTime);
  }

  // Business rule validation
  private validateBusinessRules(): void {
    if (this.endTime <= this.startTime) {
      throw new Error('End time must be after start time');
    }

    if (this.gpsPoints.length < 2) {
      throw new Error('Run must have at least 2 GPS points');
    }
  }

  // Getters for read-only access
  getId(): RunId { return this.id; }
  getStartTime(): Date { return this.startTime; }
  getEndTime(): Date { return this.endTime; }
  getGPSPoints(): ReadonlyArray<GPSPoint> { return this.gpsPoints; }
  getName(): string { return this.name; }
}
```

#### Value Objects

```typescript
// src/domain/valueObjects/Distance.ts
export class Distance {
  private constructor(private readonly meters: number) {
    if (meters < 0) {
      throw new Error('Distance cannot be negative');
    }
  }

  static fromMeters(meters: number): Distance {
    return new Distance(meters);
  }

  static fromKilometers(km: number): Distance {
    return new Distance(km * 1000);
  }

  static zero(): Distance {
    return new Distance(0);
  }

  add(other: Distance): Distance {
    return new Distance(this.meters + other.meters);
  }

  toMeters(): number { return this.meters; }
  toKilometers(): number { return this.meters / 1000; }

  equals(other: Distance): boolean {
    return this.meters === other.meters;
  }
}

// src/domain/valueObjects/Pace.ts
export class Pace {
  private constructor(private readonly minutesPerKilometer: number) {}

  static fromDistanceAndDuration(distance: Distance, duration: Duration): Pace {
    const km = distance.toKilometers();
    const minutes = duration.toMinutes();

    if (km === 0) {
      return new Pace(0);
    }

    return new Pace(minutes / km);
  }

  toMinutesPerKilometer(): number {
    return this.minutesPerKilometer;
  }

  formatAsString(): string {
    const minutes = Math.floor(this.minutesPerKilometer);
    const seconds = Math.round((this.minutesPerKilometer - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }
}
```

#### Repository Interfaces (Domain)

```typescript
// src/domain/repositories/IRunRepository.ts
export interface IRunRepository {
  save(run: Run): Promise<Result<void, RepositoryError>>;
  findById(id: RunId): Promise<Result<Run, RepositoryError>>;
  findAll(): Promise<Result<Run[], RepositoryError>>;
  delete(id: RunId): Promise<Result<void, RepositoryError>>;
}

export type RepositoryError =
  | 'NOT_FOUND'
  | 'SAVE_FAILED'
  | 'DELETE_FAILED'
  | 'CONNECTION_ERROR';
```

### 2. Application Layer (Use Cases)

**Purpose**: Orchestrates business logic and coordinates between layers

**Contains**:
- Use Cases (StartRunTracking, SaveRun, CalculatePersonalRecords)
- Application Services
- DTOs for data transfer
- Command/Query handlers

**Dependencies**: Domain Layer only

#### Use Cases

```typescript
// src/application/useCases/StartRunTrackingUseCase.ts
export class StartRunTrackingUseCase {
  constructor(
    private readonly gpsService: IGPSService,
    private readonly runRepository: IRunRepository,
    private readonly permissionService: IPermissionService
  ) {}

  async execute(): Promise<Result<RunTrackingSession, string>> {
    // 1. Check permissions
    const permissionResult = await this.permissionService.requestLocationPermission();
    if (permissionResult.isFailure) {
      return Result.failure('Location permission required to track runs');
    }

    // 2. Get initial location
    const locationResult = await this.gpsService.getCurrentLocation();
    if (locationResult.isFailure) {
      return Result.failure('Unable to get current location');
    }

    // 3. Create tracking session
    const session = RunTrackingSession.start(locationResult.value);

    // 4. Start GPS tracking
    const trackingResult = await this.gpsService.startTracking();
    if (trackingResult.isFailure) {
      return Result.failure('Failed to start GPS tracking');
    }

    return Result.success(session);
  }
}

// src/application/useCases/SaveRunUseCase.ts
export class SaveRunUseCase {
  constructor(
    private readonly runRepository: IRunRepository,
    private readonly personalRecordsService: IPersonalRecordsService
  ) {}

  async execute(runData: SaveRunCommand): Promise<Result<Run, string>> {
    // 1. Create domain entity
    const runResult = Run.create({
      startTime: runData.startTime,
      endTime: runData.endTime,
      gpsPoints: runData.gpsPoints,
      name: runData.name
    });

    if (runResult.isFailure) {
      return Result.failure(runResult.error);
    }

    const run = runResult.value;

    // 2. Save to repository
    const saveResult = await this.runRepository.save(run);
    if (saveResult.isFailure) {
      return Result.failure('Failed to save run');
    }

    // 3. Update personal records
    await this.personalRecordsService.updateRecords(run);

    return Result.success(run);
  }
}
```

#### DTOs and Commands

```typescript
// src/application/dtos/SaveRunCommand.ts
export interface SaveRunCommand {
  startTime: Date;
  endTime: Date;
  gpsPoints: GPSPointData[];
  name?: string;
}

export interface GPSPointData {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
}

// src/application/dtos/RunDTO.ts
export interface RunDTO {
  id: string;
  startTime: string;
  endTime: string;
  distance: number;
  duration: number;
  averagePace: number;
  name: string;
  gpsPoints: GPSPointDTO[];
}
```

### 3. Infrastructure Layer (External Concerns)

**Purpose**: Implements interfaces defined in Domain/Application layers

**Contains**:
- Database implementations
- GPS service implementations
- File system access
- External API clients
- Framework-specific code

**Dependencies**: Application and Domain layers

#### GPS Service Implementation

```typescript
// src/infrastructure/gps/ExpoGPSService.ts
export class ExpoGPSService implements IGPSService {
  private subscription: Location.LocationSubscription | null = null;
  private trackingPoints: GPSPoint[] = [];

  async getCurrentLocation(): Promise<Result<GPSPoint, GPSError>> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 10000
      });

      const gpsPoint = GPSPoint.create({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
        accuracy: location.coords.accuracy
      });

      return Result.success(gpsPoint);
    } catch (error) {
      return this.mapLocationError(error);
    }
  }

  async startTracking(): Promise<Result<void, GPSError>> {
    try {
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5
        },
        this.handleLocationUpdate.bind(this)
      );

      return Result.success(undefined);
    } catch (error) {
      return this.mapLocationError(error);
    }
  }

  private handleLocationUpdate(location: Location.LocationObject): void {
    const gpsPoint = GPSPoint.create({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(),
      accuracy: location.coords.accuracy
    });

    this.trackingPoints.push(gpsPoint);

    // Emit event for real-time updates
    EventBus.emit('gps-point-added', gpsPoint);
  }

  private mapLocationError(error: any): Result<never, GPSError> {
    if (error.code === 'E_LOCATION_UNAVAILABLE') {
      return Result.failure('LOCATION_UNAVAILABLE');
    }
    if (error.code === 'E_TIMEOUT') {
      return Result.failure('TIMEOUT');
    }
    return Result.failure('GPS_DISABLED');
  }
}
```

#### Database Implementation

```typescript
// src/infrastructure/persistence/SQLiteRunRepository.ts
export class SQLiteRunRepository implements IRunRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async save(run: Run): Promise<Result<void, RepositoryError>> {
    try {
      const dto = RunMapper.toDTO(run);

      await this.database.transaction(async (tx) => {
        // Save run
        await tx.executeSql(
          `INSERT OR REPLACE INTO runs
           (id, start_time, end_time, distance, duration, average_pace, name)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            dto.id,
            dto.startTime,
            dto.endTime,
            dto.distance,
            dto.duration,
            dto.averagePace,
            dto.name
          ]
        );

        // Save GPS points
        for (const point of dto.gpsPoints) {
          await tx.executeSql(
            `INSERT INTO gps_points (run_id, latitude, longitude, timestamp, accuracy)
             VALUES (?, ?, ?, ?, ?)`,
            [dto.id, point.latitude, point.longitude, point.timestamp, point.accuracy]
          );
        }
      });

      return Result.success(undefined);
    } catch (error) {
      return Result.failure('SAVE_FAILED');
    }
  }

  async findById(id: RunId): Promise<Result<Run, RepositoryError>> {
    try {
      const runRows = await this.database.query(
        'SELECT * FROM runs WHERE id = ?',
        [id.toString()]
      );

      if (runRows.length === 0) {
        return Result.failure('NOT_FOUND');
      }

      const pointRows = await this.database.query(
        'SELECT * FROM gps_points WHERE run_id = ? ORDER BY timestamp',
        [id.toString()]
      );

      const dto: RunDTO = {
        ...runRows[0],
        gpsPoints: pointRows
      };

      const run = RunMapper.toDomain(dto);
      return Result.success(run);
    } catch (error) {
      return Result.failure('CONNECTION_ERROR');
    }
  }
}
```

### 4. Presentation Layer (UI)

**Purpose**: Handles user interface and user interactions

**Contains**:
- React Components
- Screens
- Navigation
- View Models/Controllers
- UI-specific state management

**Dependencies**: Application layer only (no direct domain access)

#### Screen Components

```typescript
// src/presentation/screens/RunTrackingScreen.tsx
export const RunTrackingScreen: React.FC = () => {
  const controller = useRunTrackingController();

  return (
    <SafeAreaView style={styles.container}>
      <RunTrackingView
        isTracking={controller.isTracking}
        currentRun={controller.currentRun}
        error={controller.error}
        isLoading={controller.isLoading}
        onStartRun={controller.startRun}
        onStopRun={controller.stopRun}
        onPauseRun={controller.pauseRun}
      />
    </SafeAreaView>
  );
};
```

#### Controllers/View Models

```typescript
// src/presentation/controllers/useRunTrackingController.ts
export const useRunTrackingController = () => {
  const [state, setState] = useState<RunTrackingState>({
    isTracking: false,
    currentRun: null,
    error: null,
    isLoading: false
  });

  // Inject use cases
  const startRunUseCase = useInjection<StartRunTrackingUseCase>('StartRunUseCase');
  const stopRunUseCase = useInjection<StopRunTrackingUseCase>('StopRunUseCase');

  const startRun = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await startRunUseCase.execute();

    result.fold(
      (session) => setState(prev => ({
        ...prev,
        isTracking: true,
        currentRun: session,
        isLoading: false
      })),
      (error) => setState(prev => ({
        ...prev,
        error,
        isLoading: false
      }))
    );
  };

  const stopRun = async (): Promise<void> => {
    if (!state.currentRun) return;

    setState(prev => ({ ...prev, isLoading: true }));

    const result = await stopRunUseCase.execute(state.currentRun.id);

    result.fold(
      (completedRun) => {
        setState(prev => ({
          ...prev,
          isTracking: false,
          currentRun: null,
          isLoading: false
        }));

        // Navigate to results
        Navigation.navigate('RunSummary', { run: completedRun });
      },
      (error) => setState(prev => ({
        ...prev,
        error,
        isLoading: false
      }))
    );
  };

  return {
    ...state,
    startRun,
    stopRun,
    pauseRun: () => {}, // Implementation
    clearError: () => setState(prev => ({ ...prev, error: null }))
  };
};
```

## Dependency Injection Setup

```typescript
// src/infrastructure/di/Container.ts
export class DIContainer {
  private bindings = new Map<string, any>();

  // Service registration
  registerSingleton<T>(key: string, implementation: new (...args: any[]) => T): void {
    this.bindings.set(key, { type: 'singleton', implementation, instance: null });
  }

  registerTransient<T>(key: string, implementation: new (...args: any[]) => T): void {
    this.bindings.set(key, { type: 'transient', implementation });
  }

  // Service resolution
  resolve<T>(key: string): T {
    const binding = this.bindings.get(key);
    if (!binding) {
      throw new Error(`No binding found for ${key}`);
    }

    if (binding.type === 'singleton') {
      if (!binding.instance) {
        binding.instance = new binding.implementation();
      }
      return binding.instance;
    }

    return new binding.implementation();
  }
}

// Setup DI container
export const setupDependencyInjection = (): DIContainer => {
  const container = new DIContainer();

  // Infrastructure
  container.registerSingleton('Database', SQLiteDatabase);
  container.registerSingleton('GPSService', ExpoGPSService);
  container.registerSingleton('PermissionService', ExpoPermissionService);

  // Repositories
  container.registerSingleton('RunRepository', SQLiteRunRepository);

  // Use Cases
  container.registerTransient('StartRunUseCase', StartRunTrackingUseCase);
  container.registerTransient('StopRunUseCase', StopRunTrackingUseCase);
  container.registerTransient('SaveRunUseCase', SaveRunUseCase);

  return container;
};
```

## Layer Benefits

### Testability
- Each layer can be tested in isolation
- Easy mocking through interfaces
- Pure domain logic is framework-independent

### Maintainability
- Clear separation of concerns
- Easy to locate and modify functionality
- Dependency direction prevents coupling

### Flexibility
- Easy to swap implementations
- Framework changes don't affect business logic
- Support for different data sources

### Scalability
- Well-defined boundaries
- Easy to add new features
- Clear responsibility assignment

---

*This layered architecture ensures our React Native app remains clean, testable, and maintainable as it grows in complexity.*