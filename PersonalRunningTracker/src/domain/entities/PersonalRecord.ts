export type RecordCategory =
  | 'LONGEST_DISTANCE'
  | 'FASTEST_5K'
  | 'FASTEST_10K'
  | 'FASTEST_HALF_MARATHON'
  | 'BEST_PACE_1K'
  | 'BEST_PACE_5K'
  | 'LONGEST_DURATION';

export interface PersonalRecordId {
  value: string;
}

export interface RunId {
  value: string;
}

export class PersonalRecord {
  constructor(
    public readonly id: PersonalRecordId,
    public readonly category: RecordCategory,
    public readonly value: number,
    public readonly runId: RunId,
    public readonly achievedAt: Date,
    public readonly previousValue?: number
  ) {}

  static create(
    category: RecordCategory,
    value: number,
    runId: RunId,
    previousValue?: number
  ): PersonalRecord {
    return new PersonalRecord(
      { value: this.generateId() },
      category,
      value,
      runId,
      new Date(),
      previousValue
    );
  }

  private static generateId(): string {
    return `pr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDisplayValue(): string {
    switch (this.category) {
      case 'LONGEST_DISTANCE':
        return `${(this.value / 1000).toFixed(2)} km`;
      case 'LONGEST_DURATION':
        return this.formatDuration(this.value);
      case 'FASTEST_5K':
      case 'FASTEST_10K':
      case 'FASTEST_HALF_MARATHON':
        return this.formatDuration(this.value);
      case 'BEST_PACE_1K':
      case 'BEST_PACE_5K':
        return this.formatPace(this.value);
      default:
        return this.value.toString();
    }
  }

  getDisplayTitle(): string {
    switch (this.category) {
      case 'LONGEST_DISTANCE':
        return 'Longest Distance';
      case 'LONGEST_DURATION':
        return 'Longest Duration';
      case 'FASTEST_5K':
        return 'Fastest 5K';
      case 'FASTEST_10K':
        return 'Fastest 10K';
      case 'FASTEST_HALF_MARATHON':
        return 'Fastest Half Marathon';
      case 'BEST_PACE_1K':
        return 'Best 1K Pace';
      case 'BEST_PACE_5K':
        return 'Best 5K Pace';
      default:
        return this.category;
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private formatPace(secondsPerKm: number): string {
    if (secondsPerKm === 0 || !isFinite(secondsPerKm)) return '--:--';

    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  }

  isImprovement(): boolean {
    if (this.previousValue === undefined) return true;

    // For time-based records (duration/pace), lower is better
    if (this.category.includes('FASTEST') || this.category.includes('PACE')) {
      return this.value < this.previousValue;
    }

    // For distance/duration records, higher is better
    return this.value > this.previousValue;
  }

  getImprovementText(): string {
    if (!this.isImprovement() || this.previousValue === undefined) {
      return 'First time!';
    }

    const diff = Math.abs(this.value - this.previousValue);
    const isTimeRecord = this.category.includes('FASTEST') || this.category.includes('PACE');

    if (isTimeRecord) {
      return `${this.formatDuration(diff)} faster`;
    }

    if (this.category === 'LONGEST_DISTANCE') {
      return `${(diff / 1000).toFixed(2)} km farther`;
    }

    if (this.category === 'LONGEST_DURATION') {
      return `${this.formatDuration(diff)} longer`;
    }

    return `Improved by ${diff}`;
  }
}