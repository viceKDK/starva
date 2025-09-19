export type DistanceUnit = 'km' | 'mi';
export type PaceFormat = 'min_per_km' | 'min_per_mi' | 'mph' | 'kph';
export type GPSAccuracy = 'high' | 'balanced' | 'low';

export interface UserPreferences {
  // Unit preferences
  distanceUnit: DistanceUnit;
  paceFormat: PaceFormat;

  // GPS and tracking preferences
  gpsAccuracy: GPSAccuracy;
  autoStopEnabled: boolean;
  autoStopDuration: number; // seconds

  // Data and privacy preferences
  enableAnalytics: boolean;
  keepRunsForDays: number; // 0 = forever

  // App behavior preferences
  enableHaptics: boolean;
  enableSounds: boolean;

  // Internal tracking
  lastUpdated: Date;
  version: string;
}

export class UserPreferencesEntity {
  constructor(private preferences: UserPreferences) {}

  static createDefault(): UserPreferencesEntity {
    return new UserPreferencesEntity({
      distanceUnit: 'km',
      paceFormat: 'min_per_km',
      gpsAccuracy: 'high',
      autoStopEnabled: false,
      autoStopDuration: 300, // 5 minutes
      enableAnalytics: false,
      keepRunsForDays: 0, // Keep forever
      enableHaptics: true,
      enableSounds: false,
      lastUpdated: new Date(),
      version: '1.0.0'
    });
  }

  get distanceUnit(): DistanceUnit {
    return this.preferences.distanceUnit;
  }

  get paceFormat(): PaceFormat {
    return this.preferences.paceFormat;
  }

  get gpsAccuracy(): GPSAccuracy {
    return this.preferences.gpsAccuracy;
  }

  get autoStopEnabled(): boolean {
    return this.preferences.autoStopEnabled;
  }

  get autoStopDuration(): number {
    return this.preferences.autoStopDuration;
  }

  get enableAnalytics(): boolean {
    return this.preferences.enableAnalytics;
  }

  get keepRunsForDays(): number {
    return this.preferences.keepRunsForDays;
  }

  get enableHaptics(): boolean {
    return this.preferences.enableHaptics;
  }

  get enableSounds(): boolean {
    return this.preferences.enableSounds;
  }

  get lastUpdated(): Date {
    return this.preferences.lastUpdated;
  }

  get version(): string {
    return this.preferences.version;
  }

  // Unit conversion helpers
  convertDistance(distanceMeters: number): number {
    if (this.distanceUnit === 'mi') {
      return distanceMeters * 0.000621371; // meters to miles
    }
    return distanceMeters / 1000; // meters to kilometers
  }

  getDistanceLabel(): string {
    return this.distanceUnit === 'mi' ? 'miles' : 'km';
  }

  getDistanceShortLabel(): string {
    return this.distanceUnit;
  }

  convertPace(secondsPerKm: number): number {
    switch (this.paceFormat) {
      case 'min_per_mi':
        return secondsPerKm * 1.609344; // km to miles conversion for pace
      case 'mph':
        return 3600 / (secondsPerKm * 1.609344); // Convert to mph
      case 'kph':
        return 3600 / secondsPerKm; // Convert to kph
      default: // min_per_km
        return secondsPerKm;
    }
  }

  getPaceLabel(): string {
    switch (this.paceFormat) {
      case 'min_per_mi':
        return 'min/mi';
      case 'mph':
        return 'mph';
      case 'kph':
        return 'kph';
      default:
        return 'min/km';
    }
  }

  formatPace(secondsPerKm: number): string {
    const convertedPace = this.convertPace(secondsPerKm);

    switch (this.paceFormat) {
      case 'mph':
      case 'kph':
        return `${convertedPace.toFixed(1)} ${this.getPaceLabel()}`;
      default: // min_per_km or min_per_mi
        const minutes = Math.floor(convertedPace / 60);
        const seconds = Math.floor(convertedPace % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')} ${this.getPaceLabel()}`;
    }
  }

  formatDistance(distanceMeters: number): string {
    const converted = this.convertDistance(distanceMeters);
    return `${converted.toFixed(2)} ${this.getDistanceShortLabel()}`;
  }

  updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): UserPreferencesEntity {
    return new UserPreferencesEntity({
      ...this.preferences,
      [key]: value,
      lastUpdated: new Date()
    });
  }

  toJSON(): UserPreferences {
    return { ...this.preferences };
  }

  static fromJSON(data: UserPreferences): UserPreferencesEntity {
    return new UserPreferencesEntity({
      ...data,
      lastUpdated: new Date(data.lastUpdated)
    });
  }
}