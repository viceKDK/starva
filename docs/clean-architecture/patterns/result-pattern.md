# Result Pattern for Error Handling

## Overview

The Result Pattern replaces exception throwing with explicit success/failure returns, making error handling predictable and type-safe in our React Native application.

## Why Use Result Pattern

### Problems with Exception-Based Error Handling

#### ❌ Traditional Exception Approach
```typescript
// BAD: Exceptions are invisible in type system
class GPSService {
  async getCurrentLocation(): Promise<GPSPoint> {
    // Caller has no way to know this can fail
    const permission = await this.checkPermission();
    if (!permission) {
      throw new Error('Permission denied'); // Hidden failure path
    }

    const location = await Location.getCurrentPositionAsync();
    if (!location) {
      throw new Error('Location unavailable'); // Another hidden failure
    }

    return new GPSPoint(location.coords);
  }
}

// Caller must guess what exceptions might be thrown
const useGPS = () => {
  const [location, setLocation] = useState<GPSPoint | null>(null);

  const getLocation = async () => {
    try {
      const loc = await gpsService.getCurrentLocation();
      setLocation(loc);
    } catch (error) {
      // What errors can happen? We don't know from the type system
      console.error('Something went wrong:', error.message);
    }
  };
};
```

### Benefits of Result Pattern

- **Explicit Error Handling**: Failures are visible in the type system
- **No Hidden Exceptions**: All possible outcomes are explicit
- **Composable**: Results can be chained and transformed
- **Type Safety**: Compiler ensures error handling
- **Testable**: Easy to test both success and failure paths

## Result Implementation

### Core Result Type

```typescript
// Result<T, E> represents either success with value T or failure with error E
export abstract class Result<T, E = string> {
  abstract readonly isSuccess: boolean;
  abstract readonly isFailure: boolean;

  // Factory methods
  static success<T, E = string>(value: T): Result<T, E> {
    return new Success(value);
  }

  static failure<T, E = string>(error: E): Result<T, E> {
    return new Failure(error);
  }

  // Type guards
  isSuccessResult(): this is Success<T, E> {
    return this.isSuccess;
  }

  isFailureResult(): this is Failure<T, E> {
    return this.isFailure;
  }

  // Functional combinators
  abstract map<U>(fn: (value: T) => U): Result<U, E>;
  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;
  abstract recover(fn: (error: E) => T): T;
  abstract fold<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U): U;
}

class Success<T, E = string> extends Result<T, E> {
  readonly isSuccess = true;
  readonly isFailure = false;

  constructor(public readonly value: T) {
    super();
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    try {
      return Result.success(fn(this.value));
    } catch (error) {
      return Result.failure(error as E);
    }
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    try {
      return fn(this.value);
    } catch (error) {
      return Result.failure(error as E);
    }
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return Result.success(this.value);
  }

  recover(_fn: (error: E) => T): T {
    return this.value;
  }

  fold<U>(onSuccess: (value: T) => U, _onFailure: (error: E) => U): U {
    return onSuccess(this.value);
  }
}

class Failure<T, E = string> extends Result<T, E> {
  readonly isSuccess = false;
  readonly isFailure = true;

  constructor(public readonly error: E) {
    super();
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return Result.failure(this.error);
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return Result.failure(this.error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return Result.failure(fn(this.error));
  }

  recover(fn: (error: E) => T): T {
    return fn(this.error);
  }

  fold<U>(_onSuccess: (value: T) => U, onFailure: (error: E) => U): U {
    return onFailure(this.error);
  }
}
```

## Practical Applications

### GPS Service with Result Pattern

#### ✅ Good Example with Result Pattern
```typescript
// Domain errors as types
type GPSError =
  | 'PERMISSION_DENIED'
  | 'LOCATION_UNAVAILABLE'
  | 'GPS_DISABLED'
  | 'TIMEOUT';

interface IGPSService {
  getCurrentLocation(): Promise<Result<GPSPoint, GPSError>>;
  startTracking(): Promise<Result<void, GPSError>>;
  stopTracking(): Promise<Result<GPSPoint[], GPSError>>;
}

class ExpoGPSService implements IGPSService {
  async getCurrentLocation(): Promise<Result<GPSPoint, GPSError>> {
    // Check permissions first
    const permissionResult = await this.checkPermissions();
    if (permissionResult.isFailure) {
      return Result.failure(permissionResult.error);
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 10000
      });

      const gpsPoint = new GPSPoint({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date(),
        accuracy: location.coords.accuracy
      });

      return Result.success(gpsPoint);
    } catch (error) {
      if (error.code === 'E_LOCATION_UNAVAILABLE') {
        return Result.failure('LOCATION_UNAVAILABLE');
      }
      if (error.code === 'E_TIMEOUT') {
        return Result.failure('TIMEOUT');
      }
      return Result.failure('GPS_DISABLED');
    }
  }

  private async checkPermissions(): Promise<Result<void, GPSError>> {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') {
      return Result.success(undefined);
    }

    return Result.failure('PERMISSION_DENIED');
  }
}
```

### Database Service with Result Pattern

```typescript
// Database errors as types
type DatabaseError =
  | 'CONNECTION_FAILED'
  | 'QUERY_FAILED'
  | 'NOT_FOUND'
  | 'CONSTRAINT_VIOLATION';

interface IRunRepository {
  save(run: Run): Promise<Result<void, DatabaseError>>;
  findById(id: string): Promise<Result<Run, DatabaseError>>;
  findAll(): Promise<Result<Run[], DatabaseError>>;
  delete(id: string): Promise<Result<void, DatabaseError>>;
}

class SQLiteRunRepository implements IRunRepository {
  constructor(private database: SQLiteDatabase) {}

  async save(run: Run): Promise<Result<void, DatabaseError>> {
    try {
      const dto = RunMapper.toDTO(run);
      await this.database.execute(
        'INSERT OR REPLACE INTO runs (id, start_time, end_time, distance, route) VALUES (?, ?, ?, ?, ?)',
        [dto.id, dto.startTime, dto.endTime, dto.distance, JSON.stringify(dto.route)]
      );

      return Result.success(undefined);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return Result.failure('CONSTRAINT_VIOLATION');
      }
      return Result.failure('QUERY_FAILED');
    }
  }

  async findById(id: string): Promise<Result<Run, DatabaseError>> {
    try {
      const rows = await this.database.query(
        'SELECT * FROM runs WHERE id = ?',
        [id]
      );

      if (rows.length === 0) {
        return Result.failure('NOT_FOUND');
      }

      const run = RunMapper.toDomain(rows[0]);
      return Result.success(run);
    } catch (error) {
      return Result.failure('QUERY_FAILED');
    }
  }
}
```

### Service Composition with Result Pattern

```typescript
// Use Case that composes multiple services
class StartRunTrackingUseCase {
  constructor(
    private gpsService: IGPSService,
    private runRepository: IRunRepository,
    private permissionService: IPermissionService
  ) {}

  async execute(): Promise<Result<RunSession, string>> {
    // Functional composition of Results
    const locationResult = await this.gpsService.getCurrentLocation();

    return locationResult
      .flatMap(initialLocation => {
        // Create new run session with initial location
        const session = new RunSession({
          id: generateUUID(),
          startLocation: initialLocation,
          startTime: new Date()
        });

        return Result.success(session);
      })
      .flatMap(async session => {
        // Start GPS tracking
        const trackingResult = await this.gpsService.startTracking();
        return trackingResult.map(() => session);
      })
      .mapError(error => {
        // Transform domain errors to user-friendly messages
        switch (error) {
          case 'PERMISSION_DENIED':
            return 'Location permission is required to track runs';
          case 'GPS_DISABLED':
            return 'Please enable GPS to start tracking';
          case 'LOCATION_UNAVAILABLE':
            return 'Unable to get current location. Try again.';
          default:
            return 'Failed to start run tracking';
        }
      });
  }
}
```

### React Component Integration

```typescript
// Hook for managing run tracking with Result pattern
export const useRunTracking = () => {
  const [session, setSession] = useState<RunSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startRunUseCase = useInjection<StartRunTrackingUseCase>('StartRunUseCase');
  const stopRunUseCase = useInjection<StopRunTrackingUseCase>('StopRunUseCase');

  const startRun = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const result = await startRunUseCase.execute();

    result.fold(
      (runSession) => {
        setSession(runSession);
        setIsLoading(false);
      },
      (errorMessage) => {
        setError(errorMessage);
        setIsLoading(false);
      }
    );
  };

  const stopRun = async (): Promise<void> => {
    if (!session) return;

    setIsLoading(true);
    const result = await stopRunUseCase.execute(session.id);

    result.fold(
      (completedRun) => {
        setSession(null);
        setIsLoading(false);
        // Navigate to run summary
        NavigationService.navigate('RunSummary', { run: completedRun });
      },
      (errorMessage) => {
        setError(errorMessage);
        setIsLoading(false);
      }
    );
  };

  return {
    session,
    error,
    isLoading,
    isTracking: session !== null,
    startRun,
    stopRun
  };
};

// Component using the hook
export const RunTrackingScreen: React.FC = () => {
  const { session, error, isLoading, isTracking, startRun, stopRun } = useRunTracking();

  return (
    <SafeAreaView style={styles.container}>
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {isLoading && <LoadingSpinner />}

      {!isTracking ? (
        <StartRunButton onPress={startRun} disabled={isLoading} />
      ) : (
        <ActiveRunView
          session={session!}
          onStop={stopRun}
          disabled={isLoading}
        />
      )}
    </SafeAreaView>
  );
};
```

## Advanced Result Patterns

### Result Utilities for Common Operations

```typescript
// Utility functions for working with Results
export namespace ResultUtils {
  // Combine multiple Results - all must succeed
  export function combine<T1, T2, E>(
    r1: Result<T1, E>,
    r2: Result<T2, E>
  ): Result<[T1, T2], E> {
    if (r1.isFailure) return Result.failure(r1.error);
    if (r2.isFailure) return Result.failure(r2.error);
    return Result.success([r1.value, r2.value]);
  }

  // Convert Promise that might throw to Result
  export async function fromPromise<T>(
    promise: Promise<T>
  ): Promise<Result<T, string>> {
    try {
      const value = await promise;
      return Result.success(value);
    } catch (error) {
      return Result.failure(error.message || 'Unknown error');
    }
  }

  // Transform array of Results to Result of array
  export function sequence<T, E>(
    results: Result<T, E>[]
  ): Result<T[], E> {
    const values: T[] = [];

    for (const result of results) {
      if (result.isFailure) {
        return Result.failure(result.error);
      }
      values.push(result.value);
    }

    return Result.success(values);
  }

  // Apply function to Result value with validation
  export function validate<T, E>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: E
  ): Result<T, E> {
    return validator(value)
      ? Result.success(value)
      : Result.failure(errorMessage);
  }
}

// Example usage of utilities
const saveMultipleRuns = async (runs: Run[]): Promise<Result<void, string>> => {
  // Convert each save operation to Result
  const savePromises = runs.map(run =>
    ResultUtils.fromPromise(runRepository.save(run))
  );

  // Wait for all promises
  const saveResults = await Promise.all(savePromises);

  // Combine all results - if any fail, return failure
  const combinedResult = ResultUtils.sequence(saveResults);

  return combinedResult.map(() => undefined); // Convert T[] to void
};
```

### Result-Based Validation

```typescript
// Validation using Result pattern
interface RunValidationError {
  field: string;
  message: string;
}

class RunValidator {
  static validate(run: Run): Result<Run, RunValidationError[]> {
    const errors: RunValidationError[] = [];

    // Validate duration
    if (run.getDurationInSeconds() < 60) {
      errors.push({
        field: 'duration',
        message: 'Run must be at least 1 minute long'
      });
    }

    // Validate distance
    if (run.calculateTotalDistance() < 100) {
      errors.push({
        field: 'distance',
        message: 'Run must be at least 100 meters'
      });
    }

    // Validate GPS points
    if (run.getGPSPoints().length < 10) {
      errors.push({
        field: 'gpsPoints',
        message: 'Run must have at least 10 GPS points'
      });
    }

    return errors.length === 0
      ? Result.success(run)
      : Result.failure(errors);
  }
}

// Using validation in use case
class SaveRunUseCase {
  constructor(private runRepository: IRunRepository) {}

  async execute(run: Run): Promise<Result<void, string>> {
    return RunValidator.validate(run)
      .flatMap(validRun => this.runRepository.save(validRun))
      .mapError(errors => {
        if (Array.isArray(errors)) {
          return errors.map(e => `${e.field}: ${e.message}`).join(', ');
        }
        return errors;
      });
  }
}
```

## Result Pattern Benefits Summary

### Type Safety
- Compiler enforces error handling
- No hidden exceptions
- Clear API contracts

### Maintainability
- Explicit error flows
- Easy to refactor
- Self-documenting code

### Testability
- Easy to test success/failure paths
- No need for complex exception mocking
- Predictable behavior

### Performance
- No exception stack traces
- Faster than try/catch
- Memory efficient

---

*The Result Pattern transforms error handling from a source of bugs into a structured, type-safe approach that makes our React Native app more reliable and maintainable.*