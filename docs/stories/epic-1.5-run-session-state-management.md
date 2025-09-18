# Story 1.5: Run Session State Management Implementation

**Epic**: Foundation & GPS Core Infrastructure
**Story ID**: 1.5
**Priority**: Must Have
**Estimated Effort**: 5-7 hours

## User Story

As a developer,
I want robust run session state management with persistence and recovery,
so that user tracking sessions survive app backgrounding, navigation, and unexpected interruptions.

## Acceptance Criteria

### 1. Session State Definition
- [ ] RunSession entity created with all tracking states (idle, starting, active, paused, stopping)
- [ ] Session data includes: id, startTime, pausedDuration, currentMetrics, gpsPoints
- [ ] State transitions clearly defined with business rules validation
- [ ] Session lifecycle methods: create, start, pause, resume, stop, save, cancel

### 2. State Persistence Layer
- [ ] Session state persisted to device storage during active tracking
- [ ] State saves automatically every 30 seconds during active sessions
- [ ] Recovery mechanism loads last session on app restart
- [ ] Temporary session data cleared after successful save or cancellation
- [ ] Storage size optimized to handle GPS data efficiently

### 3. State Management Service
- [ ] SessionStateService implements ISessionStateService interface
- [ ] Service manages in-memory session state with reactive updates
- [ ] Observable session state for UI components subscription
- [ ] Thread-safe operations for background GPS updates
- [ ] State validation prevents invalid transitions

### 4. Session Recovery Mechanism
- [ ] App startup checks for incomplete sessions and offers recovery
- [ ] Recovery dialog presents session details (start time, duration, distance)
- [ ] User choice to continue, save, or discard incomplete session
- [ ] GPS service resumes tracking from last known state
- [ ] Metrics calculation continues from previous values

### 5. Background State Handling
- [ ] Session state maintained during app backgrounding (iOS 10-minute limit)
- [ ] Background location tracking configured properly
- [ ] State persistence triggered before app backgrounding
- [ ] Foreground resumption restores complete session state
- [ ] Battery optimization settings respected

### 6. Navigation Persistence
- [ ] Session state survives navigation between app screens
- [ ] Tracking continues seamlessly during screen transitions
- [ ] State accessible from any screen requiring run information
- [ ] Navigation guards prevent leaving active sessions accidentally

### 7. Error Recovery and Resilience
- [ ] Corrupted session data detection and cleanup
- [ ] GPS signal loss doesn't affect session state integrity
- [ ] Device restart recovery with data validation
- [ ] Storage full scenarios handled gracefully
- [ ] Session timeout handling for abandoned tracking

### 8. Memory and Performance Optimization
- [ ] Session state size limited to prevent memory issues
- [ ] GPS points stored efficiently with compression
- [ ] Old session data cleanup mechanism
- [ ] Memory usage monitored during extended sessions
- [ ] State updates debounced to prevent excessive storage writes

## Implementation Details

### Session State Entity
```typescript
// src/domain/entities/RunSession.ts
export class RunSession {
  constructor(
    public readonly id: SessionId,
    public readonly startTime: Date,
    private state: SessionState,
    private metrics: SessionMetrics,
    private gpsPoints: GPSPoint[]
  ) {}

  start(): Result<void, SessionError> {
    if (this.state !== 'idle') {
      return Err('INVALID_STATE_TRANSITION');
    }
    this.state = 'active';
    return Ok(undefined);
  }

  pause(): Result<void, SessionError> {
    // Implementation with state validation
  }

  addGPSPoint(point: GPSPoint): void {
    this.gpsPoints.push(point);
    this.updateMetrics();
  }
}
```

### State Service Interface
```typescript
// src/domain/services/ISessionStateService.ts
export interface ISessionStateService {
  getCurrentSession(): RunSession | null;
  createSession(): Promise<Result<SessionId, SessionError>>;
  saveSession(session: RunSession): Promise<Result<void, SessionError>>;
  loadSession(id: SessionId): Promise<Result<RunSession, SessionError>>;
  observeSession(): Observable<RunSession | null>;
}
```

### Storage Implementation
```typescript
// src/infrastructure/persistence/SessionStateStorage.ts
export class SessionStateStorage implements ISessionStateService {
  constructor(
    private storage: SecureStorage,
    private serializer: SessionSerializer
  ) {}

  async saveSession(session: RunSession): Promise<Result<void, SessionError>> {
    const serialized = this.serializer.serialize(session);
    return await this.storage.save('current_session', serialized);
  }
}
```

## Definition of Done

- [ ] Session state survives all app lifecycle scenarios
- [ ] State persistence and recovery work reliably
- [ ] Navigation doesn't interrupt session tracking
- [ ] Background/foreground transitions maintain session integrity
- [ ] Error scenarios handled without data loss
- [ ] Memory usage remains stable during extended sessions
- [ ] Unit tests cover all state transitions and edge cases
- [ ] Integration tests validate persistence and recovery

## Technical Notes

- Use React Native AsyncStorage for session persistence
- Implement observer pattern for reactive state updates
- Consider Redux or Zustand for complex state management needs
- Use React Context for session state access across components

## Dependencies

- **Prerequisite**: Stories 1.1, 1.2, 1.3 must be completed
- **Related**: Story 1.4 (Basic Run Tracking Screen) consumes this state
- **Integration**: GPS Service for location updates

## Risks

- iOS background limitations affecting state persistence
- Storage corruption leading to session data loss
- Complex state transitions creating edge case bugs
- Memory leaks from GPS point accumulation during long runs
- Race conditions between state updates and persistence