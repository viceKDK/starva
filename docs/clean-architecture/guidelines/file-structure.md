# File Structure Guidelines

## File Size and Organization Rules

### File Size Limits
- **Maximum file size**: 500 lines
- **Split threshold**: 450 lines (proactively split before hitting limit)
- **Maximum function size**: 30-50 lines
- **Maximum class size**: 200 lines (split into helper classes)
- **Maximum parameter count**: 4 parameters (use objects for more)

### File Splitting Strategy

#### When to Split Files

##### ✅ Split Triggers
```typescript
// File getting too large (approaching 450 lines)
// src/services/RunTrackingService.ts (450+ lines)

// SPLIT INTO:
// src/services/runTracking/RunTrackingService.ts (100 lines)
// src/services/runTracking/GPSLocationHandler.ts (80 lines)
// src/services/runTracking/RunDataCalculator.ts (90 lines)
// src/services/runTracking/RunPersistenceManager.ts (85 lines)
// src/services/runTracking/index.ts (5 lines - barrel export)
```

##### ✅ Class Splitting Example
```typescript
// BEFORE: Large class (250+ lines)
class RunService {
  // GPS methods (60 lines)
  startTracking() {}
  stopTracking() {}
  handleLocationUpdate() {}

  // Calculation methods (70 lines)
  calculateDistance() {}
  calculatePace() {}
  calculateElevation() {}

  // Persistence methods (80 lines)
  saveRun() {}
  loadRuns() {}
  deleteRun() {}

  // Validation methods (40 lines)
  validateRunData() {}
  validateGPSPoints() {}
}

// AFTER: Split into focused classes
class GPSTrackingService {        // 80 lines
  startTracking() {}
  stopTracking() {}
  handleLocationUpdate() {}
}

class RunCalculationService {     // 90 lines
  calculateDistance() {}
  calculatePace() {}
  calculateElevation() {}
}

class RunPersistenceService {     // 100 lines
  saveRun() {}
  loadRuns() {}
  deleteRun() {}
}

class RunValidationService {      // 60 lines
  validateRunData() {}
  validateGPSPoints() {}
}
```

## Project Structure

### Root Structure
```
src/
├── domain/                     # Domain layer (pure business logic)
│   ├── entities/              # Business entities
│   ├── valueObjects/          # Value objects
│   ├── repositories/          # Repository interfaces
│   ├── services/              # Domain services
│   └── errors/                # Domain-specific errors
├── application/               # Application layer (use cases)
│   ├── useCases/              # Use case implementations
│   ├── dtos/                  # Data transfer objects
│   ├── mappers/               # Domain ↔ DTO mapping
│   └── interfaces/            # Application service interfaces
├── infrastructure/            # Infrastructure layer
│   ├── persistence/           # Database implementations
│   ├── gps/                   # GPS service implementations
│   ├── permissions/           # Permission service implementations
│   ├── fileSystem/            # File system access
│   └── di/                    # Dependency injection
├── presentation/              # Presentation layer (UI)
│   ├── screens/               # Screen components
│   ├── components/            # Reusable UI components
│   ├── navigation/            # Navigation configuration
│   ├── controllers/           # View controllers/hooks
│   ├── viewModels/            # UI state management
│   └── styles/                # Styling
├── shared/                    # Shared utilities
│   ├── constants/             # Application constants
│   ├── utils/                 # Pure utility functions
│   ├── types/                 # Shared TypeScript types
│   └── patterns/              # Shared patterns (Result, etc.)
└── tests/                     # Test files
    ├── unit/                  # Unit tests
    ├── integration/           # Integration tests
    └── e2e/                   # End-to-end tests
```

### Domain Layer Structure

```
src/domain/
├── entities/
│   ├── run/
│   │   ├── Run.ts                    # Main Run entity (150 lines)
│   │   ├── RunId.ts                  # Value object (40 lines)
│   │   ├── RunStatus.ts              # Enum/union type (30 lines)
│   │   └── index.ts                  # Barrel export (5 lines)
│   ├── gps/
│   │   ├── GPSPoint.ts               # GPS point entity (80 lines)
│   │   ├── GPSRoute.ts               # Route collection (120 lines)
│   │   └── index.ts                  # Barrel export (5 lines)
│   └── personalRecord/
│       ├── PersonalRecord.ts         # PR entity (100 lines)
│       ├── PersonalRecordCollection.ts # Collection (150 lines)
│       └── index.ts                  # Barrel export (5 lines)
├── valueObjects/
│   ├── measurements/
│   │   ├── Distance.ts               # Distance value object (90 lines)
│   │   ├── Duration.ts               # Duration value object (80 lines)
│   │   ├── Pace.ts                   # Pace value object (100 lines)
│   │   ├── Speed.ts                  # Speed value object (70 lines)
│   │   └── index.ts                  # Barrel export (5 lines)
│   └── location/
│       ├── Coordinates.ts            # Lat/lng coordinates (60 lines)
│       ├── Altitude.ts               # Elevation value object (40 lines)
│       └── index.ts                  # Barrel export (5 lines)
├── repositories/
│   ├── IRunRepository.ts             # Run repository interface (50 lines)
│   ├── IPersonalRecordRepository.ts  # PR repository interface (40 lines)
│   └── index.ts                      # Barrel export (5 lines)
├── services/
│   ├── calculation/
│   │   ├── IDistanceCalculator.ts    # Interface (30 lines)
│   │   ├── IPaceCalculator.ts        # Interface (25 lines)
│   │   ├── IElevationCalculator.ts   # Interface (20 lines)
│   │   └── index.ts                  # Barrel export (5 lines)
│   └── validation/
│       ├── IRunValidator.ts          # Interface (35 lines)
│       ├── IGPSValidator.ts          # Interface (25 lines)
│       └── index.ts                  # Barrel export (5 lines)
└── errors/
    ├── DomainError.ts                # Base domain error (40 lines)
    ├── RunError.ts                   # Run-specific errors (60 lines)
    ├── ValidationError.ts            # Validation errors (50 lines)
    └── index.ts                      # Barrel export (5 lines)
```

### Application Layer Structure

```
src/application/
├── useCases/
│   ├── runTracking/
│   │   ├── StartRunTrackingUseCase.ts      # Start tracking (120 lines)
│   │   ├── StopRunTrackingUseCase.ts       # Stop tracking (100 lines)
│   │   ├── PauseRunTrackingUseCase.ts      # Pause tracking (80 lines)
│   │   ├── ResumeRunTrackingUseCase.ts     # Resume tracking (70 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   ├── runManagement/
│   │   ├── SaveRunUseCase.ts               # Save run (90 lines)
│   │   ├── DeleteRunUseCase.ts             # Delete run (60 lines)
│   │   ├── GetRunDetailsUseCase.ts         # Get run details (70 lines)
│   │   ├── GetRunHistoryUseCase.ts         # Get run history (80 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   └── personalRecords/
│       ├── CalculatePersonalRecordsUseCase.ts  # Calculate PRs (110 lines)
│       ├── GetPersonalRecordsUseCase.ts         # Get PRs (60 lines)
│       └── index.ts                             # Barrel export (5 lines)
├── dtos/
│   ├── run/
│   │   ├── RunDTO.ts                       # Run DTO (80 lines)
│   │   ├── CreateRunDTO.ts                 # Creation DTO (60 lines)
│   │   ├── UpdateRunDTO.ts                 # Update DTO (50 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   └── gps/
│       ├── GPSPointDTO.ts                  # GPS point DTO (40 lines)
│       ├── GPSRouteDTO.ts                  # GPS route DTO (50 lines)
│       └── index.ts                        # Barrel export (5 lines)
├── mappers/
│   ├── RunMapper.ts                        # Run domain ↔ DTO (120 lines)
│   ├── GPSMapper.ts                        # GPS domain ↔ DTO (80 lines)
│   ├── PersonalRecordMapper.ts             # PR domain ↔ DTO (70 lines)
│   └── index.ts                            # Barrel export (5 lines)
└── interfaces/
    ├── IGPSService.ts                      # GPS service interface (60 lines)
    ├── IPermissionService.ts               # Permission interface (40 lines)
    ├── INotificationService.ts             # Notification interface (35 lines)
    └── index.ts                            # Barrel export (5 lines)
```

### Infrastructure Layer Structure

```
src/infrastructure/
├── persistence/
│   ├── sqlite/
│   │   ├── SQLiteDatabase.ts               # Database wrapper (150 lines)
│   │   ├── SQLiteRunRepository.ts          # Run repository impl (180 lines)
│   │   ├── SQLitePersonalRecordRepository.ts # PR repository impl (120 lines)
│   │   ├── migrations/
│   │   │   ├── Migration001_InitialSchema.ts    # Initial migration (100 lines)
│   │   │   ├── Migration002_AddPersonalRecords.ts # PR migration (80 lines)
│   │   │   └── index.ts                          # Migration export (10 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   └── schemas/
│       ├── RunSchema.ts                    # Run table schema (60 lines)
│       ├── GPSPointSchema.ts               # GPS points schema (50 lines)
│       ├── PersonalRecordSchema.ts         # PR schema (40 lines)
│       └── index.ts                        # Barrel export (5 lines)
├── gps/
│   ├── expo/
│   │   ├── ExpoGPSService.ts               # Expo GPS implementation (200 lines)
│   │   ├── ExpoLocationProvider.ts         # Location provider (120 lines)
│   │   ├── ExpoLocationPermissions.ts      # Permission handler (80 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   └── mock/
│       ├── MockGPSService.ts               # Mock for testing (100 lines)
│       └── index.ts                        # Barrel export (5 lines)
├── calculations/
│   ├── DistanceCalculator.ts               # Distance calculations (90 lines)
│   ├── PaceCalculator.ts                   # Pace calculations (70 lines)
│   ├── ElevationCalculator.ts              # Elevation calculations (80 lines)
│   └── index.ts                            # Barrel export (5 lines)
└── di/
    ├── Container.ts                        # DI container (150 lines)
    ├── ServiceRegistration.ts              # Service setup (100 lines)
    ├── TestContainer.ts                    # Test DI container (80 lines)
    └── index.ts                            # Barrel export (5 lines)
```

### Presentation Layer Structure

```
src/presentation/
├── screens/
│   ├── runTracking/
│   │   ├── RunTrackingScreen.tsx           # Main screen (120 lines)
│   │   ├── components/
│   │   │   ├── ActiveRunDisplay.tsx        # Active run UI (80 lines)
│   │   │   ├── RunControls.tsx             # Control buttons (60 lines)
│   │   │   ├── RunMetrics.tsx              # Metrics display (70 lines)
│   │   │   └── index.ts                    # Barrel export (5 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   ├── runHistory/
│   │   ├── RunHistoryScreen.tsx            # History screen (100 lines)
│   │   ├── components/
│   │   │   ├── RunList.tsx                 # Run list (90 lines)
│   │   │   ├── RunListItem.tsx             # List item (60 lines)
│   │   │   ├── RunSearchFilter.tsx         # Search/filter (80 lines)
│   │   │   └── index.ts                    # Barrel export (5 lines)
│   │   └── index.ts                        # Barrel export (5 lines)
│   └── runDetails/
│       ├── RunDetailScreen.tsx             # Detail screen (110 lines)
│       ├── components/
│       │   ├── RunMap.tsx                  # Map display (100 lines)
│       │   ├── RunStatistics.tsx           # Stats display (80 lines)
│       │   ├── RunMetricsCard.tsx          # Metrics card (50 lines)
│       │   └── index.ts                    # Barrel export (5 lines)
│       └── index.ts                        # Barrel export (5 lines)
├── components/
│   ├── common/
│   │   ├── buttons/
│   │   │   ├── PrimaryButton.tsx           # Primary button (40 lines)
│   │   │   ├── SecondaryButton.tsx         # Secondary button (35 lines)
│   │   │   ├── IconButton.tsx              # Icon button (30 lines)
│   │   │   └── index.ts                    # Barrel export (5 lines)
│   │   ├── forms/
│   │   │   ├── TextInput.tsx               # Text input (50 lines)
│   │   │   ├── FormField.tsx               # Form field wrapper (40 lines)
│   │   │   ├── ValidationMessage.tsx       # Validation display (25 lines)
│   │   │   └── index.ts                    # Barrel export (5 lines)
│   │   └── layout/
│   │       ├── Screen.tsx                  # Screen wrapper (60 lines)
│   │       ├── Card.tsx                    # Card component (45 lines)
│   │       ├── LoadingSpinner.tsx          # Loading indicator (30 lines)
│   │       └── index.ts                    # Barrel export (5 lines)
│   └── specialized/
│       ├── maps/
│       │   ├── RunMap.tsx                  # Run map display (120 lines)
│       │   ├── MapMarker.tsx               # Custom marker (40 lines)
│       │   ├── RoutePolyline.tsx           # Route display (60 lines)
│       │   └── index.ts                    # Barrel export (5 lines)
│       └── charts/
│           ├── PaceChart.tsx               # Pace visualization (100 lines)
│           ├── ElevationChart.tsx          # Elevation chart (90 lines)
│           └── index.ts                    # Barrel export (5 lines)
├── controllers/
│   ├── useRunTrackingController.ts         # Run tracking logic (150 lines)
│   ├── useRunHistoryController.ts          # History logic (120 lines)
│   ├── useRunDetailsController.ts          # Details logic (100 lines)
│   ├── usePersonalRecordsController.ts     # PR logic (90 lines)
│   └── index.ts                            # Barrel export (5 lines)
├── navigation/
│   ├── AppNavigator.tsx                    # Main navigator (80 lines)
│   ├── TabNavigator.tsx                    # Tab navigation (60 lines)
│   ├── StackNavigator.tsx                  # Stack navigation (70 lines)
│   ├── NavigationService.ts                # Navigation utilities (50 lines)
│   └── index.ts                            # Barrel export (5 lines)
└── styles/
    ├── theme/
    │   ├── colors.ts                       # Color palette (40 lines)
    │   ├── typography.ts                   # Font styles (50 lines)
    │   ├── spacing.ts                      # Spacing constants (30 lines)
    │   └── index.ts                        # Barrel export (5 lines)
    ├── components/
    │   ├── buttonStyles.ts                 # Button styles (60 lines)
    │   ├── cardStyles.ts                   # Card styles (40 lines)
    │   ├── screenStyles.ts                 # Screen styles (50 lines)
    │   └── index.ts                        # Barrel export (5 lines)
    └── globalStyles.ts                     # Global styles (70 lines)
```

## Naming Conventions

### File Naming

#### ✅ Good Examples
```
// Components: PascalCase
RunTrackingScreen.tsx
PersonalRecordCard.tsx
GPSLocationDisplay.tsx

// Services: PascalCase with suffix
RunCalculationService.ts
GPSTrackingService.ts
PersonalRecordRepository.ts

// Hooks: camelCase with 'use' prefix
useRunTrackingController.ts
usePersonalRecords.ts
useGPSLocation.ts

// Types/Interfaces: PascalCase
RunEntity.ts
IRunRepository.ts
GPSServiceInterface.ts

// Constants: SCREAMING_SNAKE_CASE
DATABASE_CONSTANTS.ts
GPS_CONFIGURATION.ts
APPLICATION_SETTINGS.ts

// Utilities: camelCase
distanceCalculator.ts
dateFormatter.ts
coordinateValidator.ts
```

#### ❌ Bad Examples
```
// Avoid generic names
utils.ts          → distanceCalculator.ts
helpers.ts        → runDataFormatter.ts
manager.ts        → runPersistenceService.ts
service.ts        → gpsTrackingService.ts

// Avoid unclear abbreviations
runSvc.ts         → runService.ts
gpsLoc.ts         → gpsLocationService.ts
prRec.ts          → personalRecordRepository.ts
```

### Folder Naming

#### ✅ Good Structure
```
// Feature-based folders
src/domain/entities/run/
src/domain/entities/personalRecord/
src/application/useCases/runTracking/
src/presentation/screens/runHistory/

// Layer-based organization
src/domain/
src/application/
src/infrastructure/
src/presentation/

// Technology-specific folders
src/infrastructure/sqlite/
src/infrastructure/expo/
src/presentation/react/
```

### Index Files for Clean Imports

#### ✅ Barrel Exports
```typescript
// src/domain/entities/index.ts
export { Run } from './run/Run';
export { GPSPoint } from './gps/GPSPoint';
export { PersonalRecord } from './personalRecord/PersonalRecord';

// src/application/useCases/index.ts
export { StartRunTrackingUseCase } from './runTracking/StartRunTrackingUseCase';
export { SaveRunUseCase } from './runManagement/SaveRunUseCase';

// Clean imports in consuming code
import { Run, GPSPoint } from '@/domain/entities';
import { StartRunTrackingUseCase } from '@/application/useCases';
```

## File Content Organization

### Class File Structure
```typescript
// 1. Imports (grouped and sorted)
import { React } from 'react';
import { View, Text } from 'react-native';

import { Run } from '@/domain/entities';
import { IRunRepository } from '@/domain/repositories';

import { Result } from '@/shared/patterns';

// 2. Types and interfaces
interface ComponentProps {
  run: Run;
  onSave: (run: Run) => void;
}

type ComponentState = {
  isLoading: boolean;
  error: string | null;
};

// 3. Constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT = 5000;

// 4. Main class/component (max 200 lines)
export class RunService {
  // Constructor and dependencies
  constructor(private repository: IRunRepository) {}

  // Public methods (max 50 lines each)
  async saveRun(run: Run): Promise<Result<void, string>> {
    // Implementation
  }

  // Private methods (max 50 lines each)
  private validateRun(run: Run): boolean {
    // Implementation
  }
}

// 5. Helper functions (if needed, max 30 lines each)
function formatRunTime(seconds: number): string {
  // Implementation
}

// 6. Default export (if applicable)
export default RunService;
```

### Split Triggers and Actions

#### When File Reaches 450 Lines
```typescript
// BEFORE: Large service file (450+ lines)
// src/services/RunService.ts

// AFTER: Split into focused files
// src/services/run/RunService.ts (main coordinator, 100 lines)
// src/services/run/RunValidator.ts (validation logic, 80 lines)
// src/services/run/RunCalculator.ts (calculations, 90 lines)
// src/services/run/RunPersistence.ts (persistence, 85 lines)
// src/services/run/RunFormatter.ts (formatting, 60 lines)
// src/services/run/index.ts (barrel export, 5 lines)
```

#### When Class Reaches 200 Lines
```typescript
// BEFORE: Large class
class RunTrackingService {
  // GPS methods (80 lines)
  // Calculation methods (70 lines)
  // Persistence methods (60 lines)
}

// AFTER: Split responsibilities
class RunTrackingCoordinator {         // 60 lines - coordinates other services
  constructor(
    private gpsService: GPSService,
    private calculator: RunCalculator,
    private persistence: RunPersistence
  ) {}
}

class GPSService {                     // 90 lines - GPS only
}

class RunCalculator {                  // 80 lines - calculations only
}

class RunPersistence {                 // 70 lines - persistence only
}
```

---

*Following these file structure guidelines ensures our codebase remains modular, maintainable, and easy to navigate as it grows.*