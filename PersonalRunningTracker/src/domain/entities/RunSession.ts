import { GPSPoint } from './GPSPoint';
import { Result, Ok, Err } from '@/shared/types';

export type SessionId = string;

export enum SessionState {
  IDLE = 'idle',
  STARTING = 'starting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export type SessionError =
  | 'INVALID_STATE_TRANSITION'
  | 'SESSION_NOT_FOUND'
  | 'SERIALIZATION_ERROR'
  | 'STORAGE_ERROR'
  | 'SESSION_EXPIRED'
  | 'INVALID_SESSION_DATA';

export interface SessionMetrics {
  duration: number; // seconds (excluding paused time)
  pausedDuration: number; // total paused time in seconds
  distance: number; // meters
  averagePace: number; // seconds per km
  currentSpeed: number; // m/s
  maxSpeed: number; // m/s
  elevationGain: number; // meters
  lastUpdated: Date;
}

export interface SessionData {
  id: SessionId;
  startTime: Date;
  endTime?: Date;
  state: SessionState;
  metrics: SessionMetrics;
  gpsPoints: GPSPoint[];
  pauseSegments: Array<{ startTime: Date; endTime?: Date }>;
  createdAt: Date;
  lastSavedAt: Date;
}

export class RunSession {
  private data: SessionData;
  private stateTransitionRules: Map<SessionState, SessionState[]>;

  constructor(sessionData: SessionData) {
    this.data = { ...sessionData };
    this.initializeStateTransitionRules();
  }

  private initializeStateTransitionRules(): void {
    this.stateTransitionRules = new Map([
      [SessionState.IDLE, [SessionState.STARTING]],
      [SessionState.STARTING, [SessionState.ACTIVE, SessionState.CANCELLED]],
      [SessionState.ACTIVE, [SessionState.PAUSED, SessionState.STOPPING]],
      [SessionState.PAUSED, [SessionState.ACTIVE, SessionState.STOPPING]],
      [SessionState.STOPPING, [SessionState.COMPLETED, SessionState.CANCELLED]],
      [SessionState.COMPLETED, []],
      [SessionState.CANCELLED, []]
    ]);
  }

  // Static factory method
  static create(id?: SessionId): RunSession {
    const sessionId = id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sessionData: SessionData = {
      id: sessionId,
      startTime: now,
      state: SessionState.IDLE,
      metrics: {
        duration: 0,
        pausedDuration: 0,
        distance: 0,
        averagePace: 0,
        currentSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0,
        lastUpdated: now
      },
      gpsPoints: [],
      pauseSegments: [],
      createdAt: now,
      lastSavedAt: now
    };

    return new RunSession(sessionData);
  }

  // Getters
  get id(): SessionId { return this.data.id; }
  get state(): SessionState { return this.data.state; }
  get startTime(): Date { return this.data.startTime; }
  get endTime(): Date | undefined { return this.data.endTime; }
  get metrics(): Readonly<SessionMetrics> { return { ...this.data.metrics }; }
  get gpsPoints(): readonly GPSPoint[] { return [...this.data.gpsPoints]; }
  get pauseSegments(): readonly Array<{ startTime: Date; endTime?: Date }> {
    return [...this.data.pauseSegments];
  }
  get createdAt(): Date { return this.data.createdAt; }
  get lastSavedAt(): Date { return this.data.lastSavedAt; }

  // State transition methods
  start(): Result<void, SessionError> {
    return this.transitionTo(SessionState.STARTING);
  }

  activate(): Result<void, SessionError> {
    const result = this.transitionTo(SessionState.ACTIVE);
    if (result.success) {
      this.data.startTime = new Date();
      this.updateMetrics();
    }
    return result;
  }

  pause(): Result<void, SessionError> {
    const result = this.transitionTo(SessionState.PAUSED);
    if (result.success) {
      const now = new Date();
      this.data.pauseSegments.push({ startTime: now });
      this.updateMetrics();
    }
    return result;
  }

  resume(): Result<void, SessionError> {
    const result = this.transitionTo(SessionState.ACTIVE);
    if (result.success) {
      const now = new Date();
      const currentPause = this.data.pauseSegments[this.data.pauseSegments.length - 1];
      if (currentPause && !currentPause.endTime) {
        currentPause.endTime = now;
      }
      this.updateMetrics();
    }
    return result;
  }

  stop(): Result<void, SessionError> {
    return this.transitionTo(SessionState.STOPPING);
  }

  complete(): Result<void, SessionError> {
    const result = this.transitionTo(SessionState.COMPLETED);
    if (result.success) {
      this.data.endTime = new Date();
      this.finalizeMetrics();
    }
    return result;
  }

  cancel(): Result<void, SessionError> {
    const result = this.transitionTo(SessionState.CANCELLED);
    if (result.success) {
      this.data.endTime = new Date();
    }
    return result;
  }

  // GPS data management
  addGPSPoint(point: GPSPoint): void {
    if (this.data.state !== SessionState.ACTIVE) {
      return; // Only add points during active tracking
    }

    this.data.gpsPoints.push(point);
    this.updateMetrics();
  }

  addGPSPoints(points: GPSPoint[]): void {
    if (this.data.state !== SessionState.ACTIVE) {
      return;
    }

    this.data.gpsPoints.push(...points);
    this.updateMetrics();
  }

  // Metrics calculation
  private updateMetrics(): void {
    const now = new Date();

    // Calculate duration (excluding paused time)
    const totalElapsedMs = now.getTime() - this.data.startTime.getTime();
    const pausedMs = this.calculateTotalPausedTime();
    this.data.metrics.duration = Math.max(0, Math.floor((totalElapsedMs - pausedMs) / 1000));

    // Calculate distance
    this.data.metrics.distance = this.calculateTotalDistance();

    // Calculate pace
    if (this.data.metrics.distance > 0 && this.data.metrics.duration > 0) {
      this.data.metrics.averagePace = this.data.metrics.duration / (this.data.metrics.distance / 1000);
    }

    // Calculate current speed
    this.data.metrics.currentSpeed = this.calculateCurrentSpeed();

    // Update max speed
    if (this.data.metrics.currentSpeed > this.data.metrics.maxSpeed) {
      this.data.metrics.maxSpeed = this.data.metrics.currentSpeed;
    }

    // Calculate elevation gain
    this.data.metrics.elevationGain = this.calculateElevationGain();

    this.data.metrics.lastUpdated = now;
  }

  private finalizeMetrics(): void {
    // Final calculation of all metrics
    if (this.data.endTime) {
      const totalElapsedMs = this.data.endTime.getTime() - this.data.startTime.getTime();
      const pausedMs = this.calculateTotalPausedTime();
      this.data.metrics.duration = Math.max(0, Math.floor((totalElapsedMs - pausedMs) / 1000));
    }

    this.data.metrics.distance = this.calculateTotalDistance();
    this.data.metrics.elevationGain = this.calculateElevationGain();

    if (this.data.metrics.distance > 0 && this.data.metrics.duration > 0) {
      this.data.metrics.averagePace = this.data.metrics.duration / (this.data.metrics.distance / 1000);
    }

    this.data.metrics.lastUpdated = new Date();
  }

  private calculateTotalPausedTime(): number {
    let totalPausedMs = 0;
    const now = new Date();

    for (const segment of this.data.pauseSegments) {
      const endTime = segment.endTime || (this.data.state === SessionState.PAUSED ? now : segment.startTime);
      totalPausedMs += endTime.getTime() - segment.startTime.getTime();
    }

    this.data.metrics.pausedDuration = Math.floor(totalPausedMs / 1000);
    return totalPausedMs;
  }

  private calculateTotalDistance(): number {
    if (this.data.gpsPoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.data.gpsPoints.length; i++) {
      totalDistance += this.haversineDistance(this.data.gpsPoints[i - 1]!, this.data.gpsPoints[i]!);
    }

    return totalDistance;
  }

  private calculateCurrentSpeed(): number {
    if (this.data.gpsPoints.length < 2) return 0;

    // Use last 3 points for smoothing
    const recentPoints = this.data.gpsPoints.slice(-3);
    if (recentPoints.length < 2) return 0;

    const startPoint = recentPoints[0]!;
    const endPoint = recentPoints[recentPoints.length - 1]!;

    const distance = this.haversineDistance(startPoint, endPoint);
    const timeSpanMs = endPoint.timestamp.getTime() - startPoint.timestamp.getTime();

    return timeSpanMs > 0 ? (distance / (timeSpanMs / 1000)) : 0;
  }

  private calculateElevationGain(): number {
    if (this.data.gpsPoints.length < 2) return 0;

    let totalGain = 0;
    for (let i = 1; i < this.data.gpsPoints.length; i++) {
      const prevAltitude = this.data.gpsPoints[i - 1]?.altitude || 0;
      const currAltitude = this.data.gpsPoints[i]?.altitude || 0;

      if (currAltitude > prevAltitude) {
        totalGain += currAltitude - prevAltitude;
      }
    }

    return totalGain;
  }

  private haversineDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private transitionTo(newState: SessionState): Result<void, SessionError> {
    const allowedTransitions = this.stateTransitionRules.get(this.data.state) || [];

    if (!allowedTransitions.includes(newState)) {
      return Err('INVALID_STATE_TRANSITION');
    }

    this.data.state = newState;
    return Ok(undefined);
  }

  // Serialization support
  toJSON(): SessionData {
    return {
      ...this.data,
      gpsPoints: this.data.gpsPoints.map(point => ({
        ...point,
        timestamp: point.timestamp.toISOString()
      })) as any,
      startTime: this.data.startTime.toISOString() as any,
      endTime: this.data.endTime?.toISOString() as any,
      createdAt: this.data.createdAt.toISOString() as any,
      lastSavedAt: this.data.lastSavedAt.toISOString() as any,
      pauseSegments: this.data.pauseSegments.map(segment => ({
        startTime: segment.startTime.toISOString() as any,
        endTime: segment.endTime?.toISOString() as any
      })),
      metrics: {
        ...this.data.metrics,
        lastUpdated: this.data.metrics.lastUpdated.toISOString() as any
      }
    };
  }

  static fromJSON(json: any): Result<RunSession, SessionError> {
    try {
      const sessionData: SessionData = {
        ...json,
        startTime: new Date(json.startTime),
        endTime: json.endTime ? new Date(json.endTime) : undefined,
        createdAt: new Date(json.createdAt),
        lastSavedAt: new Date(json.lastSavedAt),
        gpsPoints: json.gpsPoints.map((point: any) => ({
          ...point,
          timestamp: new Date(point.timestamp)
        })),
        pauseSegments: json.pauseSegments.map((segment: any) => ({
          startTime: new Date(segment.startTime),
          endTime: segment.endTime ? new Date(segment.endTime) : undefined
        })),
        metrics: {
          ...json.metrics,
          lastUpdated: new Date(json.metrics.lastUpdated)
        }
      };

      return Ok(new RunSession(sessionData));
    } catch (error) {
      return Err('SERIALIZATION_ERROR');
    }
  }

  // Utility methods
  isActive(): boolean {
    return this.data.state === SessionState.ACTIVE;
  }

  isPaused(): boolean {
    return this.data.state === SessionState.PAUSED;
  }

  isCompleted(): boolean {
    return this.data.state === SessionState.COMPLETED;
  }

  canBeSaved(): boolean {
    return this.data.gpsPoints.length > 0 && this.data.metrics.distance > 0;
  }

  markAsSaved(): void {
    this.data.lastSavedAt = new Date();
  }

  clone(): RunSession {
    return new RunSession({
      ...this.data,
      gpsPoints: [...this.data.gpsPoints],
      pauseSegments: [...this.data.pauseSegments],
      metrics: { ...this.data.metrics }
    });
  }
}