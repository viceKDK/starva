export type AchievementType =
  | 'DISTANCE_MILESTONE'
  | 'CONSISTENCY'
  | 'VOLUME'
  | 'FREQUENCY'
  | 'SPEED';

export interface AchievementId {
  value: string;
}

export interface RunId {
  value: string;
}

export interface AchievementCriteria {
  distance?: number; // in kilometers for distance milestones
  consecutiveDays?: number; // for consistency achievements
  totalDistance?: number; // in kilometers for volume achievements
  totalRuns?: number; // for frequency achievements
  pace?: number; // in seconds per km for speed achievements
}

export class Achievement {
  constructor(
    public readonly id: AchievementId,
    public readonly type: AchievementType,
    public readonly title: string,
    public readonly description: string,
    public readonly criteria: AchievementCriteria,
    public readonly earnedAt?: Date,
    public readonly runId?: RunId
  ) {}

  static createDistanceMilestone(
    distance: number,
    runId: RunId
  ): Achievement {
    return new Achievement(
      { value: this.generateId() },
      'DISTANCE_MILESTONE',
      `First ${distance}K Completed!`,
      `You completed your first ${distance} kilometer run!`,
      { distance },
      new Date(),
      runId
    );
  }

  static createConsistencyAchievement(
    consecutiveDays: number,
    runId: RunId
  ): Achievement {
    return new Achievement(
      { value: this.generateId() },
      'CONSISTENCY',
      `${consecutiveDays} Day Streak!`,
      `You've run for ${consecutiveDays} consecutive days. Keep it up!`,
      { consecutiveDays },
      new Date(),
      runId
    );
  }

  static createVolumeAchievement(
    totalDistance: number,
    runId: RunId
  ): Achievement {
    return new Achievement(
      { value: this.generateId() },
      'VOLUME',
      `${totalDistance}K Total Distance!`,
      `You've run a total of ${totalDistance} kilometers. Amazing dedication!`,
      { totalDistance },
      new Date(),
      runId
    );
  }

  static createFrequencyAchievement(
    totalRuns: number,
    runId: RunId
  ): Achievement {
    return new Achievement(
      { value: this.generateId() },
      'FREQUENCY',
      `${totalRuns} Runs Completed!`,
      `You've completed ${totalRuns} runs. You're building a great habit!`,
      { totalRuns },
      new Date(),
      runId
    );
  }

  static createSpeedAchievement(
    pace: number,
    runId: RunId
  ): Achievement {
    const paceMinutes = Math.floor(pace / 60);
    const paceSeconds = Math.floor(pace % 60);
    const paceStr = `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;

    return new Achievement(
      { value: this.generateId() },
      'SPEED',
      `Sub-${paceStr} Pace!`,
      `You achieved a pace faster than ${paceStr} per kilometer. Speedy!`,
      { pace },
      new Date(),
      runId
    );
  }

  private static generateId(): string {
    return `achievement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getIconName(): string {
    switch (this.type) {
      case 'DISTANCE_MILESTONE':
        return 'trail-sign';
      case 'CONSISTENCY':
        return 'calendar';
      case 'VOLUME':
        return 'bar-chart';
      case 'FREQUENCY':
        return 'repeat';
      case 'SPEED':
        return 'flash';
      default:
        return 'trophy';
    }
  }

  getColor(): string {
    switch (this.type) {
      case 'DISTANCE_MILESTONE':
        return '#4CAF50'; // Green
      case 'CONSISTENCY':
        return '#2196F3'; // Blue
      case 'VOLUME':
        return '#FF9800'; // Orange
      case 'FREQUENCY':
        return '#9C27B0'; // Purple
      case 'SPEED':
        return '#F44336'; // Red
      default:
        return '#FF6B35'; // Default orange
    }
  }

  getDifficulty(): 'Easy' | 'Medium' | 'Hard' | 'Epic' {
    switch (this.type) {
      case 'DISTANCE_MILESTONE':
        if (this.criteria.distance! <= 5) return 'Easy';
        if (this.criteria.distance! <= 21) return 'Medium';
        return 'Hard';

      case 'CONSISTENCY':
        if (this.criteria.consecutiveDays! <= 3) return 'Easy';
        if (this.criteria.consecutiveDays! <= 7) return 'Medium';
        if (this.criteria.consecutiveDays! <= 30) return 'Hard';
        return 'Epic';

      case 'VOLUME':
        if (this.criteria.totalDistance! <= 50) return 'Easy';
        if (this.criteria.totalDistance! <= 100) return 'Medium';
        if (this.criteria.totalDistance! <= 500) return 'Hard';
        return 'Epic';

      case 'FREQUENCY':
        if (this.criteria.totalRuns! <= 10) return 'Easy';
        if (this.criteria.totalRuns! <= 50) return 'Medium';
        if (this.criteria.totalRuns! <= 100) return 'Hard';
        return 'Epic';

      case 'SPEED':
        if (this.criteria.pace! >= 360) return 'Easy'; // 6:00+ pace
        if (this.criteria.pace! >= 300) return 'Medium'; // 5:00-6:00 pace
        if (this.criteria.pace! >= 240) return 'Hard'; // 4:00-5:00 pace
        return 'Epic'; // Sub-4:00 pace

      default:
        return 'Medium';
    }
  }

  isEarned(): boolean {
    return this.earnedAt !== undefined;
  }

  getFormattedDate(): string {
    if (!this.earnedAt) return '';

    return this.earnedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getShareText(): string {
    if (!this.isEarned()) return '';

    return `🏆 Achievement Unlocked: ${this.title}\n\n${this.description}\n\nAchieved on ${this.getFormattedDate()}\n\n#running #achievement #fitness`;
  }
}