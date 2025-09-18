# Testing Strategy

## Testing Pyramid

```
    E2E Tests (Detox)
    /              \
  Integration Tests
  /                \
Component Tests    Service Tests
```

## Test Organization

### Frontend Tests

```
__tests__/
├── components/
│   ├── tracking/
│   │   ├── ActiveRunDisplay.test.tsx
│   │   └── RunControls.test.tsx
│   ├── history/
│   │   ├── RunList.test.tsx
│   │   └── PersonalRecordsCard.test.tsx
│   └── maps/
│       └── RouteMap.test.tsx
├── screens/
│   ├── TrackingScreen.test.tsx
│   ├── HistoryScreen.test.tsx
│   └── RunDetailScreen.test.tsx
├── services/
│   ├── gpsService.test.ts
│   ├── databaseService.test.ts
│   └── personalRecordsService.test.ts
└── utils/
    ├── calculations.test.ts
    └── formatters.test.ts
```

### E2E Tests

```
e2e/
├── tracking.e2e.js
├── history.e2e.js
├── runDetail.e2e.js
└── permissions.e2e.js
```

## Test Examples

### Frontend Component Test

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RunControls } from '../components/tracking/RunControls';

describe('RunControls', () => {
  it('should start tracking when start button pressed', () => {
    const mockStart = jest.fn();
    const { getByText } = render(
      <RunControls
        isTracking={false}
        isPaused={false}
        onStart={mockStart}
        onPause={jest.fn()}
        onStop={jest.fn()}
      />
    );

    fireEvent.press(getByText('Start'));
    expect(mockStart).toHaveBeenCalled();
  });
});
```

### Service Test

```typescript
import { GPSService } from '../services/gpsService';
import * as Location from 'expo-location';

jest.mock('expo-location');

describe('GPSService', () => {
  it('should request permissions before starting tracking', async () => {
    const mockRequestPermissions = jest.spyOn(Location, 'requestForegroundPermissionsAsync')
      .mockResolvedValue({ status: 'granted' });

    const gpsService = new GPSService();
    const result = await gpsService.startTracking(jest.fn());

    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
```

### E2E Test

```typescript
describe('Run Tracking Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete a full run tracking session', async () => {
    // Start tracking
    await element(by.text('Start Run')).tap();
    await expect(element(by.text('00:00'))).toBeVisible();

    // Simulate run for a few seconds
    await waitFor(element(by.text('00:03'))).toBeVisible().withTimeout(5000);

    // Stop tracking
    await element(by.text('Stop')).tap();

    // Verify run saved
    await element(by.text('History')).tap();
    await expect(element(by.text('Today'))).toBeVisible();
  });
});
```
