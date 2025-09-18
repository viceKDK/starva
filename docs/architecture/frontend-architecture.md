# Frontend Architecture

## Component Architecture

### Component Organization

```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── PermissionPrompt.tsx
│   ├── tracking/
│   │   ├── ActiveRunDisplay.tsx
│   │   ├── RunControls.tsx
│   │   └── MetricsDisplay.tsx
│   ├── history/
│   │   ├── RunList.tsx
│   │   ├── RunListItem.tsx
│   │   └── PersonalRecordsCard.tsx
│   └── maps/
│       ├── RouteMap.tsx
│       └── RunSummaryMap.tsx
├── screens/
│   ├── TrackingScreen.tsx
│   ├── HistoryScreen.tsx
│   └── RunDetailScreen.tsx
├── services/
│   ├── gpsService.ts
│   ├── databaseService.ts
│   └── personalRecordsService.ts
├── types/
│   ├── Run.ts
│   ├── GPSPoint.ts
│   └── PersonalRecord.ts
└── utils/
    ├── formatters.ts
    ├── calculations.ts
    └── permissions.ts
```

### Component Template

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComponentProps {
  // Define props with TypeScript
}

export const ComponentName: React.FC<ComponentProps> = ({
  // destructure props
}) => {
  // Component logic

  return (
    <View style={styles.container}>
      <Text>Component content</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // StyleSheet for performance
  },
});
```

## State Management Architecture

### State Structure

```typescript
// Global app state using React Context
interface AppState {
  // Current tracking state
  currentRun: {
    isTracking: boolean;
    isPaused: boolean;
    startTime?: Date;
    currentDistance: number;
    currentDuration: number;
    route: GPSPoint[];
  };

  // Persisted data
  runs: Run[];
  personalRecords: PersonalRecord[];

  // App state
  isLoading: boolean;
  error?: string;
}

// Actions for state updates
type AppAction =
  | { type: 'START_TRACKING'; startTime: Date }
  | { type: 'UPDATE_CURRENT_RUN'; distance: number; duration: number; point: GPSPoint }
  | { type: 'PAUSE_TRACKING' }
  | { type: 'STOP_TRACKING'; run: Run }
  | { type: 'LOAD_RUNS'; runs: Run[] }
  | { type: 'ADD_RUN'; run: Run }
  | { type: 'UPDATE_RUN'; id: string; updates: Partial<Run> }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string };
```

### State Management Patterns
- React Context for global state (tracking status, runs data)
- useReducer for complex state transitions
- Custom hooks for service integration (useGPS, useDatabase)
- Local component state for UI-only state
- Optimistic updates for better UX

## Routing Architecture

### Route Organization

```
App Navigator (Stack)
├── Main Tabs (Bottom Tabs)
│   ├── Tracking Tab -> TrackingScreen
│   └── History Tab -> HistoryScreen
└── Run Detail (Modal) -> RunDetailScreen
    ├── Run Summary
    ├── Route Map
    └── Edit Run Form
```

### Protected Route Pattern

```typescript
// Location permission wrapper
export const LocationProtectedScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return <LoadingSpinner />;
  }

  if (hasPermission === false) {
    return <PermissionPrompt />;
  }

  return <>{children}</>;
};
```

## Frontend Services Layer

### API Client Setup

```typescript
// No traditional API client needed - local services only
import { databaseService } from './databaseService';
import { gpsService } from './gpsService';

// Service aggregator for easy imports
export const services = {
  database: databaseService,
  gps: gpsService,
};
```

### Service Example

```typescript
// GPS Service implementation
export class GPSService {
  private subscription: Location.LocationSubscription | null = null;

  async startTracking(callback: (point: GPSPoint) => void): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return false;
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            timestamp: new Date(),
            accuracy: location.coords.accuracy,
          });
        }
      );

      return true;
    } catch (error) {
      console.error('GPS tracking error:', error);
      return false;
    }
  }

  stopTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

export const gpsService = new GPSService();
```
