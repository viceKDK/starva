# GRASP Principles Applied to React Native

## Overview

GRASP (General Responsibility Assignment Software Patterns) principles guide how we assign responsibilities to classes and objects in our React Native architecture.

## 1. Creator Principle

### Definition
**Assign creation responsibility to the class that has the information needed to create the object**

### React Native Application

#### ✅ Good Example
```typescript
// RunSession has the information needed to create GPSPoints
class RunSession {
  private gpsPoints: GPSPoint[] = [];
  private startTime: Date;

  // Creator: RunSession creates GPSPoints because it has the context
  addLocationUpdate(latitude: number, longitude: number): void {
    const gpsPoint = new GPSPoint({
      latitude,
      longitude,
      timestamp: new Date(),
      sessionId: this.id
    });
    this.gpsPoints.push(gpsPoint);
  }
}

// Factory creates complex objects when it has the configuration
class RunSessionFactory {
  createTrackingSession(userId: string, activityType: ActivityType): RunSession {
    return new RunSession({
      userId,
      activityType,
      startTime: new Date(),
      id: this.generateSessionId()
    });
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: Random class creating objects without proper context
class MapComponent {
  render() {
    // MapComponent shouldn't create GPSPoints - it doesn't have the context
    const point = new GPSPoint(lat, lng, new Date());
    return <MapView markers={[point]} />;
  }
}
```

## 2. Information Expert Principle

### Definition
**Assign responsibility to the class that has the information necessary to fulfill it**

### React Native Application

#### ✅ Good Example
```typescript
// Run class has the information needed to calculate its own statistics
class Run {
  constructor(
    private readonly gpsPoints: GPSPoint[],
    private readonly startTime: Date,
    private readonly endTime: Date
  ) {}

  // Information Expert: Run calculates its own distance
  calculateTotalDistance(): number {
    return this.gpsPoints.reduce((total, point, index) => {
      if (index === 0) return 0;
      return total + this.calculateDistanceBetween(
        this.gpsPoints[index - 1],
        point
      );
    }, 0);
  }

  // Information Expert: Run calculates its own duration
  getDurationInSeconds(): number {
    return (this.endTime.getTime() - this.startTime.getTime()) / 1000;
  }

  // Information Expert: Run calculates its own average pace
  getAveragePace(): number {
    const distanceKm = this.calculateTotalDistance() / 1000;
    const durationMinutes = this.getDurationInSeconds() / 60;
    return durationMinutes / distanceKm; // minutes per km
  }
}

// PersonalRecords has the information to determine if a run is a new record
class PersonalRecords {
  constructor(private records: Map<number, PersonalRecord>) {}

  // Information Expert: PersonalRecords knows how to check for new records
  isNewPersonalRecord(run: Run): boolean {
    const distance = run.calculateTotalDistance();
    const currentRecord = this.records.get(distance);
    return !currentRecord || run.getDurationInSeconds() < currentRecord.timeInSeconds;
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: External class calculating what Run should calculate
class RunStatsCalculator {
  // BAD: This class doesn't have the run's internal information
  calculateDistance(startTime: Date, endTime: Date, points: GPSPoint[]): number {
    // Should be Run's responsibility
  }
}
```

## 3. Controller Principle

### Definition
**Assign responsibility for handling system events to a controller class**

### React Native Application

#### ✅ Good Example
```typescript
// Use Case Controller handles specific business operations
class StartRunTrackingUseCase {
  constructor(
    private gpsService: IGPSService,
    private runRepository: IRunRepository,
    private permissionService: IPermissionService
  ) {}

  async execute(): Promise<Result<RunSession>> {
    // Controller coordinates the use case
    const permissionResult = await this.permissionService.requestLocationPermission();
    if (permissionResult.isFailure) {
      return Result.failure('Location permission required');
    }

    const gpsResult = await this.gpsService.startTracking();
    if (gpsResult.isFailure) {
      return Result.failure('Failed to start GPS tracking');
    }

    const session = RunSessionFactory.createNew();
    return Result.success(session);
  }
}

// Screen Controller manages UI interactions
export const useRunTrackingController = () => {
  const [runSession, setRunSession] = useState<RunSession | null>(null);
  const startRunUseCase = useInjection<StartRunTrackingUseCase>('StartRunUseCase');

  const handleStartRun = async (): Promise<void> => {
    const result = await startRunUseCase.execute();
    if (result.isSuccess) {
      setRunSession(result.value);
    } else {
      // Handle error appropriately
      showErrorAlert(result.error);
    }
  };

  return { runSession, handleStartRun };
};
```

#### ❌ Bad Example
```typescript
// BAD: UI component handling business logic directly
const RunTrackingScreen: React.FC = () => {
  const handleStartRun = async () => {
    // BAD: Business logic mixed with UI
    const permission = await Location.requestPermissionsAsync();
    if (permission.status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync();
    const session = new RunSession();
    // ... more business logic in UI
  };
}
```

## 4. High Cohesion Principle

### Definition
**Classes should have focused, highly related responsibilities**

### React Native Application

#### ✅ Good Example
```typescript
// High Cohesion: All methods relate to GPS tracking
class GPSTrackingService implements IGPSService {
  private subscription: Location.LocationSubscription | null = null;
  private currentAccuracy: Location.Accuracy = Location.Accuracy.BestForNavigation;

  async startTracking(): Promise<Result<void>> {
    // All methods focus on GPS tracking concerns
  }

  async stopTracking(): Promise<Result<GPSPoint[]>> {
    // Related to GPS tracking
  }

  private async requestPermissions(): Promise<boolean> {
    // Related helper method
  }

  private configureAccuracy(accuracy: Location.Accuracy): void {
    // Related configuration method
  }
}

// High Cohesion: All methods relate to run calculations
class RunCalculationService {
  calculateDistance(points: GPSPoint[]): number {
    // Focused on calculations
  }

  calculatePace(distance: number, duration: number): number {
    // Related calculation
  }

  calculateElevationGain(points: GPSPoint[]): number {
    // Related calculation
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: Low Cohesion - unrelated responsibilities
class MixedService {
  // GPS tracking
  startTracking(): void {}

  // Database operations
  saveRun(run: Run): void {}

  // UI formatting
  formatTime(seconds: number): string {}

  // Network calls
  uploadToCloud(data: any): void {}

  // Utility functions
  generateUUID(): string {}
}
```

## 5. Low Coupling Principle

### Definition
**Minimize dependencies between classes**

### React Native Application

#### ✅ Good Example
```typescript
// Low Coupling: Depends only on interfaces
class RunPersistenceService implements IRunPersistenceService {
  constructor(
    private database: IDatabase, // Interface, not concrete class
    private logger: ILogger      // Interface dependency
  ) {}

  async saveRun(run: Run): Promise<Result<void>> {
    try {
      await this.database.save('runs', run.toDTO());
      this.logger.info(`Run saved: ${run.id}`);
      return Result.success();
    } catch (error) {
      this.logger.error('Failed to save run', error);
      return Result.failure('Save operation failed');
    }
  }
}

// Dependencies injected through constructor
const persistenceService = new RunPersistenceService(
  new SQLiteDatabase(),
  new ConsoleLogger()
);
```

#### ❌ Bad Example
```typescript
// BAD: High Coupling - direct dependencies
class TightlyCoupledService {
  async saveRun(run: Run): Promise<void> {
    // Directly coupled to concrete implementations
    const db = new SQLiteDatabase();
    const logger = new FileLogger('/app/logs/app.log');
    const formatter = new JSONFormatter();
    const validator = new RunValidator();

    // Hard to test, hard to change
    if (validator.validate(run)) {
      await db.save(formatter.format(run));
      logger.log('Run saved');
    }
  }
}
```

## 6. Polymorphism Principle

### Definition
**Use polymorphism to handle variations based on type**

### React Native Application

#### ✅ Good Example
```typescript
// Polymorphism: Different export strategies
interface IRunExportStrategy {
  export(run: Run): Promise<Result<string>>;
  getFileExtension(): string;
}

class GPXExportStrategy implements IRunExportStrategy {
  async export(run: Run): Promise<Result<string>> {
    const gpxData = this.convertToGPX(run);
    return Result.success(gpxData);
  }

  getFileExtension(): string {
    return '.gpx';
  }
}

class CSVExportStrategy implements IRunExportStrategy {
  async export(run: Run): Promise<Result<string>> {
    const csvData = this.convertToCSV(run);
    return Result.success(csvData);
  }

  getFileExtension(): string {
    return '.csv';
  }
}

// Context uses polymorphism instead of conditionals
class RunExportContext {
  constructor(private strategy: IRunExportStrategy) {}

  async exportRun(run: Run): Promise<Result<string>> {
    // Polymorphic call - no conditionals needed
    return await this.strategy.export(run);
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: Using conditionals instead of polymorphism
class BadExportService {
  async export(run: Run, format: string): Promise<string> {
    // BAD: Switch statement that will grow over time
    switch (format) {
      case 'gpx':
        return this.exportGPX(run);
      case 'csv':
        return this.exportCSV(run);
      case 'json':
        return this.exportJSON(run);
      // Adding new format requires modifying this class
      default:
        throw new Error('Unsupported format');
    }
  }
}
```

## 7. Indirection Principle

### Definition
**Introduce intermediate objects to decouple components**

### React Native Application

#### ✅ Good Example
```typescript
// Indirection: EventBus decouples run tracking from UI updates
interface IEventBus {
  publish<T>(event: string, data: T): void;
  subscribe<T>(event: string, handler: (data: T) => void): void;
}

class RunTrackingService {
  constructor(private eventBus: IEventBus) {}

  private onLocationUpdate(location: GPSPoint): void {
    // Service doesn't know about UI components
    this.eventBus.publish('location-updated', location);
  }

  private onRunCompleted(run: Run): void {
    // Decoupled from UI through event bus
    this.eventBus.publish('run-completed', run);
  }
}

// UI subscribes to events without direct coupling
export const RunTrackingScreen: React.FC = () => {
  const eventBus = useInjection<IEventBus>('EventBus');

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('location-updated', (location: GPSPoint) => {
      updateMapMarker(location);
    });

    return unsubscribe;
  }, []);
};

// Repository pattern as indirection for data access
interface IRunRepository {
  save(run: Run): Promise<Result<void>>;
  findById(id: string): Promise<Result<Run>>;
}

class RunRepository implements IRunRepository {
  // Indirection: Repository hides database implementation details
  constructor(private database: IDatabase) {}

  async save(run: Run): Promise<Result<void>> {
    // Business objects don't deal with database specifics
    const dto = RunMapper.toDTO(run);
    return await this.database.save('runs', dto);
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: Direct coupling without indirection
class DirectlyCoupledTrackingService {
  constructor(
    private mapComponent: MapComponent,        // Direct UI coupling
    private database: SQLiteDatabase,         // Direct DB coupling
    private notificationService: PushNotificationService // Direct service coupling
  ) {}

  onLocationUpdate(location: GPSPoint): void {
    // Tightly coupled - hard to test and change
    this.mapComponent.updateMarker(location);
    this.database.updateCurrentRun(location);
    this.notificationService.showProgress();
  }
}
```

## 8. Protected Variations Principle

### Definition
**Identify variation points and protect against them with stable interfaces**

### React Native Application

#### ✅ Good Example
```typescript
// Protected Variations: Interface protects against database changes
interface IRunPersistence {
  save(run: Run): Promise<Result<void>>;
  findAll(): Promise<Result<Run[]>>;
  delete(id: string): Promise<Result<void>>;
}

// Multiple implementations protected by interface
class SQLiteRunPersistence implements IRunPersistence {
  async save(run: Run): Promise<Result<void>> {
    // SQLite implementation
  }
}

class AsyncStorageRunPersistence implements IRunPersistence {
  async save(run: Run): Promise<Result<void>> {
    // AsyncStorage implementation
  }
}

class CloudRunPersistence implements IRunPersistence {
  async save(run: Run): Promise<Result<void>> {
    // Cloud storage implementation
  }
}

// Business logic protected from persistence changes
class RunManagementService {
  constructor(private persistence: IRunPersistence) {}

  // This code never changes regardless of persistence implementation
  async saveRun(run: Run): Promise<Result<void>> {
    const validationResult = this.validateRun(run);
    if (validationResult.isFailure) {
      return validationResult;
    }

    return await this.persistence.save(run);
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: No protection against variations
class UnprotectedRunService {
  async saveRun(run: Run): Promise<void> {
    // Directly coupled to SQLite - changing storage requires code changes
    const db = new SQLiteDatabase();
    await db.execute('INSERT INTO runs...');

    // If we switch to AsyncStorage, this all needs to change
    const serialized = JSON.stringify(run);
    await AsyncStorage.setItem(`run_${run.id}`, serialized);
  }
}
```

## 9. Pure Fabrication Principle

### Definition
**Create artificial classes to support high cohesion and low coupling when domain objects can't handle the responsibility**

### React Native Application

#### ✅ Good Example
```typescript
// Pure Fabrication: Artificial classes for better design

// Artificial class to handle run calculations (not a domain object)
class RunMetricsCalculator {
  static calculateDistance(gpsPoints: GPSPoint[]): number {
    return gpsPoints.reduce((total, point, index) => {
      if (index === 0) return 0;
      return total + DistanceCalculator.haversineDistance(
        gpsPoints[index - 1],
        point
      );
    }, 0);
  }

  static calculateAveragePace(distance: number, duration: number): number {
    const distanceKm = distance / 1000;
    const durationMinutes = duration / 60;
    return durationMinutes / distanceKm;
  }
}

// Artificial class for mapping between domain and DTOs
class RunMapper {
  static toDomain(dto: RunDTO): Run {
    return new Run({
      id: dto.id,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      gpsPoints: dto.gpsPoints.map(p => new GPSPoint(p))
    });
  }

  static toDTO(run: Run): RunDTO {
    return {
      id: run.getId(),
      startTime: run.getStartTime().toISOString(),
      endTime: run.getEndTime().toISOString(),
      gpsPoints: run.getGPSPoints().map(p => p.toDTO())
    };
  }
}

// Artificial class for dependency injection container
class DIContainer {
  private bindings = new Map<string, any>();

  bind<T>(key: string, implementation: new (...args: any[]) => T): void {
    this.bindings.set(key, implementation);
  }

  resolve<T>(key: string): T {
    const Implementation = this.bindings.get(key);
    if (!Implementation) {
      throw new Error(`No binding found for ${key}`);
    }
    return new Implementation();
  }
}
```

#### ❌ Bad Example
```typescript
// BAD: Forcing domain objects to handle artificial concerns
class Run {
  // Domain object forced to handle mapping concerns
  toDTO(): RunDTO {
    // This is not a domain responsibility
  }

  // Domain object forced to handle database concerns
  saveToDatabase(): Promise<void> {
    // This is not a domain responsibility
  }

  // Domain object forced to handle UI concerns
  formatForDisplay(): string {
    // This is not a domain responsibility
  }
}
```

## GRASP Quick Reference

| Principle | What | When to Apply | React Native Example |
|-----------|------|---------------|---------------------|
| **Creator** | Who creates objects | Class has info needed | RunSession creates GPSPoints |
| **Information Expert** | Who has the info | Assign to data owner | Run calculates its own distance |
| **Controller** | Handles system events | Coordinate use cases | StartRunUseCase handles run start |
| **High Cohesion** | Focused responsibilities | Keep related together | GPSService only does GPS |
| **Low Coupling** | Minimize dependencies | Use interfaces | Depend on IDatabase, not SQLite |
| **Polymorphism** | Handle type variations | Avoid switch statements | Export strategies |
| **Indirection** | Decouple components | Add intermediary | EventBus, Repository |
| **Protected Variations** | Shield from changes | Identify variation points | IRunPersistence interface |
| **Pure Fabrication** | Artificial helper classes | Domain can't handle it | Mappers, Calculators |

---

*GRASP principles help us assign responsibilities logically, creating a well-structured React Native architecture.*