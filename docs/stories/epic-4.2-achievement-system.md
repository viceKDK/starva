# Story 4.2: Achievement System and Progress Tracking

**Epic**: Personal Records & Achievements
**Story ID**: 4.2
**Priority**: Could Have
**Estimated Effort**: 5-7 hours

## User Story

As a user,
I want to unlock achievements and track my running milestones,
so that I stay motivated and celebrate my consistent running progress.

## Acceptance Criteria

### 1. Achievement Categories
- [ ] Distance milestones: 5K, 10K, 21K, 42K first completions
- [ ] Consistency achievements: 3, 7, 30 consecutive running days
- [ ] Volume achievements: 50K, 100K, 500K total distance
- [ ] Frequency achievements: 10, 50, 100 total runs completed
- [ ] Speed achievements: Sub-6:00, Sub-5:00, Sub-4:00 pace per kilometer

### 2. Achievement Detection System
- [ ] Achievements unlocked automatically after run completion
- [ ] Progress tracking for incremental achievements
- [ ] Achievement validation with proper criteria checking
- [ ] Duplicate achievement prevention
- [ ] Historical run analysis for existing achievements

### 3. Achievement Notifications
- [ ] "Achievement Unlocked!" modal after earning achievement
- [ ] Achievement badge displayed prominently
- [ ] Achievement description explains what was accomplished
- [ ] Celebration animation or visual feedback
- [ ] Option to share achievement immediately

### 4. Progress Indicators
- [ ] Progress bars for incremental achievements
- [ ] "Next milestone" display showing upcoming targets
- [ ] Percentage complete for distance/volume goals
- [ ] Days remaining for consistency challenges
- [ ] Clear indication of achievement requirements

### 5. Achievements Dashboard
- [ ] Dedicated screen showing all earned achievements
- [ ] Achievement categories organized clearly
- [ ] Date earned displayed for each achievement
- [ ] Progress indicators for in-progress achievements
- [ ] Achievement rarity or difficulty indicators

### 6. Motivation Features
- [ ] Achievement suggestions based on recent activity
- [ ] "Almost there!" notifications for near-completion goals
- [ ] Weekly/monthly progress summaries
- [ ] Streak counters for consistency tracking
- [ ] Personal milestone celebrations

### 7. Social and Sharing Features
- [ ] Share individual achievements with custom messages
- [ ] Achievement image generation for social sharing
- [ ] Copy achievement text to clipboard
- [ ] Export achievement summary
- [ ] Achievement badge collection display

### 8. Data Integrity and Performance
- [ ] Achievement calculations complete within 1 second
- [ ] Achievement detection doesn't impact run save performance
- [ ] Proper data validation prevents invalid achievements
- [ ] Achievement data backed up with run data
- [ ] Efficient database queries for progress tracking

## Implementation Details

### Achievement Entity
```typescript
// src/domain/entities/Achievement.ts
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
      AchievementId.generate(),
      'DISTANCE_MILESTONE',
      `First ${distance}K Completed!`,
      `You completed your first ${distance} kilometer run!`,
      { distance },
      new Date(),
      runId
    );
  }
}

export interface AchievementCriteria {
  distance?: number;
  consecutiveDays?: number;
  totalDistance?: number;
  totalRuns?: number;
  pace?: number;
}
```

### Achievement Detection Service
```typescript
// src/application/services/AchievementDetectionService.ts
export class AchievementDetectionService {
  constructor(
    private achievementRepository: IAchievementRepository,
    private runRepository: IRunRepository
  ) {}

  async detectNewAchievements(run: Run): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    // Check distance milestones
    const distanceAchievements = await this.checkDistanceMilestones(run);
    newAchievements.push(...distanceAchievements);

    // Check consistency achievements
    const consistencyAchievements = await this.checkConsistencyMilestones(run);
    newAchievements.push(...consistencyAchievements);

    // Check volume achievements
    const volumeAchievements = await this.checkVolumeAchievements(run);
    newAchievements.push(...volumeAchievements);

    return newAchievements;
  }

  private async checkDistanceMilestones(run: Run): Promise<Achievement[]> {
    const milestones = [5, 10, 21.1, 42.2];
    const achievements: Achievement[] = [];

    for (const milestone of milestones) {
      if (run.distance.kilometers >= milestone) {
        const exists = await this.achievementRepository.findByTypeAndCriteria(
          'DISTANCE_MILESTONE',
          { distance: milestone }
        );

        if (!exists) {
          achievements.push(
            Achievement.createDistanceMilestone(milestone, run.id)
          );
        }
      }
    }

    return achievements;
  }
}
```

### Achievement Progress Tracker
```typescript
// src/application/services/AchievementProgressService.ts
export class AchievementProgressService {
  async getAchievementProgress(): Promise<AchievementProgress[]> {
    const allRuns = await this.runRepository.findAll();
    const achievements = await this.achievementRepository.findAll();

    return [
      this.calculateDistanceProgress(allRuns, achievements),
      this.calculateConsistencyProgress(allRuns, achievements),
      this.calculateVolumeProgress(allRuns, achievements)
    ].flat();
  }

  private calculateVolumeProgress(
    runs: Run[],
    earnedAchievements: Achievement[]
  ): AchievementProgress[] {
    const totalDistance = runs.reduce((sum, run) => sum + run.distance.kilometers, 0);
    const volumeMilestones = [50, 100, 500, 1000];

    return volumeMilestones.map(milestone => {
      const isEarned = earnedAchievements.some(
        a => a.type === 'VOLUME_MILESTONE' && a.criteria.totalDistance === milestone
      );

      return {
        type: 'VOLUME_MILESTONE',
        title: `${milestone}K Total Distance`,
        progress: Math.min(totalDistance / milestone, 1),
        isEarned,
        current: totalDistance,
        target: milestone
      };
    });
  }
}
```

## Definition of Done

- [ ] Achievement system detects all defined achievement types
- [ ] Achievement notifications display correctly after earning
- [ ] Progress tracking shows accurate progress toward goals
- [ ] Achievements dashboard displays all earned achievements
- [ ] Achievement sharing functionality works properly
- [ ] Performance requirements met during achievement detection
- [ ] Historical run analysis works for existing users
- [ ] Component tests verify achievement logic and UI

## Technical Notes

- Store achievements in separate table for efficient querying
- Use batch processing for historical achievement analysis
- Consider achievement definition configuration for easy updates
- Implement proper caching for achievement progress calculations

## Dependencies

- **Prerequisite**: Stories 2.1, 2.2, and 4.1 must be completed
- **Integration**: Database repositories for achievement storage
- **Related**: Personal Records system for milestone detection

## Risks

- Complex achievement logic creating performance issues
- User overwhelm with too many achievement notifications
- Data integrity issues with concurrent achievement detection
- Battery impact from frequent achievement calculations