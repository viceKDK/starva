# SOLID Principles Applied to React Native

## Overview

SOLID principles guide our React Native architecture to create maintainable, extensible, and testable code.

## S - Single Responsibility Principle (SRP)

### Definition
**Each class should have only one reason to change**

### Application in React Native

#### ❌ Bad Example - Multiple Responsibilities
```typescript
// BAD: Component handles UI, data fetching, and business logic
class RunTrackingScreen extends Component {
  saveRunToDatabase(run: Run) { /* database logic */ }
  calculateDistance(points: GPSPoint[]) { /* calculation logic */ }
  render() { /* UI logic */ }
}
```

#### ✅ Good Example - Single Responsibilities
```typescript
// GOOD: Each class has one responsibility

// UI Component - Only handles presentation
export const RunTrackingScreen: React.FC = () => {
  const { startRun, stopRun, currentRun } = useRunTrackingController();
  return <RunTrackingView {...currentRun} onStart={startRun} onStop={stopRun} />;
};

// Business Logic - Only handles run tracking logic
export class RunTrackingController {
  constructor(
    private runCalculationService: IRunCalculationService,
    private runPersistenceService: IRunPersistenceService
  ) {}

  async startRun(): Promise<Result<void>> { /* tracking logic only */ }
}

// Data Persistence - Only handles database operations
export class RunPersistenceService implements IRunPersistenceService {
  async saveRun(run: Run): Promise<Result<void>> { /* database logic only */ }
}
```

### SRP Violation Indicators
- Classes with "And" in their name
- Methods handling multiple concerns
- Large classes (> 200 lines)
- Classes that import from multiple unrelated domains

## O - Open/Closed Principle (OCP)

### Definition
**Software entities should be open for extension, closed for modification**

### Application in React Native

#### ❌ Bad Example - Violates OCP
```typescript
// BAD: Adding new export format requires modifying existing code
class RunExportService {
  exportRun(run: Run, format: string): string {
    switch (format) {
      case 'gpx':
        return this.exportToGPX(run);
      case 'csv':
        return this.exportToCSV(run);
      // Adding new format requires modifying this class
      default:
        throw new Error('Unsupported format');
    }
  }
}
```

#### ✅ Good Example - Follows OCP
```typescript
// GOOD: New formats can be added without modifying existing code

interface IRunExporter {
  export(run: Run): Promise<Result<string>>;
  getSupportedFormat(): string;
}

class GPXRunExporter implements IRunExporter {
  async export(run: Run): Promise<Result<string>> {
    // GPX export logic
    return Result.success(gpxData);
  }

  getSupportedFormat(): string { return 'gpx'; }
}

class CSVRunExporter implements IRunExporter {
  async export(run: Run): Promise<Result<string>> {
    // CSV export logic
    return Result.success(csvData);
  }

  getSupportedFormat(): string { return 'csv'; }
}

// Factory pattern enables extension without modification
class RunExportFactory {
  private exporters = new Map<string, IRunExporter>();

  registerExporter(exporter: IRunExporter): void {
    this.exporters.set(exporter.getSupportedFormat(), exporter);
  }

  createExporter(format: string): Result<IRunExporter> {
    const exporter = this.exporters.get(format);
    return exporter
      ? Result.success(exporter)
      : Result.failure(`Unsupported format: ${format}`);
  }
}
```

### OCP Benefits
- Easy to add new features without breaking existing code
- Reduces regression risk
- Supports plugin architecture

## L - Liskov Substitution Principle (LSP)

### Definition
**Objects of a superclass should be replaceable with objects of subclasses**

### Application in React Native

#### ❌ Bad Example - Violates LSP
```typescript
// BAD: GPSTracker can't substitute LocationProvider
interface ILocationProvider {
  getCurrentLocation(): Promise<GPSPoint>;
}

class MockLocationProvider implements ILocationProvider {
  async getCurrentLocation(): Promise<GPSPoint> {
    return { latitude: 0, longitude: 0, timestamp: new Date() };
  }
}

class GPSTracker implements ILocationProvider {
  async getCurrentLocation(): Promise<GPSPoint> {
    // Violates LSP: throws unexpected exception
    const permission = await this.checkPermission();
    if (!permission) {
      throw new Error('Permission denied'); // Base interface doesn't expect this
    }
    return this.getLocation();
  }
}
```

#### ✅ Good Example - Follows LSP
```typescript
// GOOD: All implementations honor the contract

interface ILocationProvider {
  getCurrentLocation(): Promise<Result<GPSPoint>>;
}

class MockLocationProvider implements ILocationProvider {
  async getCurrentLocation(): Promise<Result<GPSPoint>> {
    const mockPoint = { latitude: 0, longitude: 0, timestamp: new Date() };
    return Result.success(mockPoint);
  }
}

class GPSLocationProvider implements ILocationProvider {
  async getCurrentLocation(): Promise<Result<GPSPoint>> {
    const permission = await this.checkPermission();
    if (!permission) {
      return Result.failure('Location permission denied');
    }

    const location = await this.getDeviceLocation();
    return Result.success(location);
  }
}

// Both can be used interchangeably
class RunTrackingService {
  constructor(private locationProvider: ILocationProvider) {}

  async startTracking(): Promise<Result<void>> {
    const locationResult = await this.locationProvider.getCurrentLocation();
    if (locationResult.isFailure) {
      return Result.failure(locationResult.error);
    }
    // Continue tracking...
    return Result.success();
  }
}
```

### LSP Guidelines
- Subclasses must honor base class contracts
- Return types should be compatible
- Exceptions should be expected by clients
- Preconditions cannot be stronger
- Postconditions cannot be weaker

## I - Interface Segregation Principle (ISP)

### Definition
**Clients should not be forced to depend on interfaces they don't use**

### Application in React Native

#### ❌ Bad Example - Fat Interface
```typescript
// BAD: Monolithic interface forces unwanted dependencies
interface IRunService {
  // GPS tracking methods
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  getCurrentLocation(): Promise<GPSPoint>;

  // Database methods
  saveRun(run: Run): Promise<void>;
  getAllRuns(): Promise<Run[]>;
  deleteRun(id: string): Promise<void>;

  // Export methods
  exportToGPX(run: Run): Promise<string>;
  exportToCSV(run: Run): Promise<string>;

  // Statistics methods
  calculatePersonalRecords(): Promise<PersonalRecord[]>;
  getRunningStatistics(): Promise<RunStatistics>;
}

// Components forced to depend on everything
class SimpleRunList {
  constructor(private runService: IRunService) {} // Only needs database methods
}
```

#### ✅ Good Example - Segregated Interfaces
```typescript
// GOOD: Small, focused interfaces

interface IGPSTrackingService {
  startTracking(): Promise<Result<void>>;
  stopTracking(): Promise<Result<void>>;
  getCurrentLocation(): Promise<Result<GPSPoint>>;
}

interface IRunPersistenceService {
  saveRun(run: Run): Promise<Result<void>>;
  getAllRuns(): Promise<Result<Run[]>>;
  deleteRun(id: string): Promise<Result<void>>;
}

interface IRunExportService {
  exportRun(run: Run, format: string): Promise<Result<string>>;
  getSupportedFormats(): string[];
}

interface IRunStatisticsService {
  calculatePersonalRecords(runs: Run[]): PersonalRecord[];
  generateStatistics(runs: Run[]): RunStatistics;
}

// Components depend only on what they need
class RunListComponent {
  constructor(private persistenceService: IRunPersistenceService) {}
}

class RunExportComponent {
  constructor(
    private persistenceService: IRunPersistenceService,
    private exportService: IRunExportService
  ) {}
}
```

### ISP Benefits
- Reduced coupling
- Easier testing (fewer mocks needed)
- Clear responsibilities
- Better maintainability

## D - Dependency Inversion Principle (DIP)

### Definition
**High-level modules should not depend on low-level modules. Both should depend on abstractions**

### Application in React Native

#### ❌ Bad Example - Concrete Dependencies
```typescript
// BAD: High-level class depends on concrete implementations
import { SQLiteDatabase } from './SQLiteDatabase';
import { ExpoGPSService } from './ExpoGPSService';

class RunTrackingController {
  private database = new SQLiteDatabase(); // Concrete dependency
  private gpsService = new ExpoGPSService(); // Concrete dependency

  async saveRun(run: Run): Promise<void> {
    await this.database.save(run); // Tightly coupled
  }
}
```

#### ✅ Good Example - Abstract Dependencies
```typescript
// GOOD: Depends on abstractions, not concretions

interface IRunRepository {
  save(run: Run): Promise<Result<void>>;
  findAll(): Promise<Result<Run[]>>;
}

interface IGPSService {
  startTracking(): Promise<Result<void>>;
  stopTracking(): Promise<Result<GPSPoint[]>>;
}

class RunTrackingController {
  constructor(
    private runRepository: IRunRepository,
    private gpsService: IGPSService
  ) {}

  async saveRun(run: Run): Promise<Result<void>> {
    return await this.runRepository.save(run);
  }
}

// Concrete implementations
class SQLiteRunRepository implements IRunRepository {
  async save(run: Run): Promise<Result<void>> {
    // SQLite implementation
  }
}

class ExpoGPSService implements IGPSService {
  async startTracking(): Promise<Result<void>> {
    // Expo Location implementation
  }
}

// Dependency injection setup
const container = new Container();
container.bind<IRunRepository>('RunRepository').to(SQLiteRunRepository);
container.bind<IGPSService>('GPSService').to(ExpoGPSService);
```

### DIP Benefits
- Easy to test (mock dependencies)
- Easy to switch implementations
- Decoupled architecture
- Supports dependency injection

## SOLID Quick Reference Table

| Principle | What | How to Identify Violations | React Native Example |
|-----------|------|----------------------------|---------------------|
| **S**RP | Una responsabilidad por clase | Clases que manejan UI + lógica + datos | Componente que hace fetch, calcula y renderiza |
| **O**CP | Extensible sin modificar | `switch` statements para tipos | Agregar formato de export requiere modificar clase |
| **L**SP | Subtipos reemplazan padre | Implementaciones lanzan excepciones inesperadas | Mock service no compatible con real service |
| **I**SP | Interfaces pequeñas | Interfaces con métodos no usados | Componente simple forzado a implementar 20 métodos |
| **D**IP | Depender de abstracciones | `new` directo en constructores | `new SQLiteDB()` hardcoded en service |

---

*Aplicar SOLID en React Native nos da código más mantenible, testeable y escalable.*