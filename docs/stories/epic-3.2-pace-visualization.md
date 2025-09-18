# Story 3.2: Pace and Performance Visualization

**Epic**: Route Visualization & Maps
**Story ID**: 3.2
**Priority**: Should Have
**Estimated Effort**: 6-8 hours

## User Story

As a user,
I want to visualize my pace variations and performance metrics throughout my run,
so that I can understand my pacing strategy and identify areas for improvement.

## Acceptance Criteria

### 1. Pace Chart Implementation
- [ ] Line chart displaying pace variations over time/distance
- [ ] X-axis represents time or distance (user selectable)
- [ ] Y-axis shows pace in minutes per kilometer
- [ ] Smooth curve interpolation for better visualization
- [ ] Chart responsive to device orientation changes

### 2. Kilometer Split Analysis
- [ ] Table displaying pace for each kilometer segment
- [ ] Fastest and slowest splits highlighted distinctly
- [ ] Split time comparison with average pace
- [ ] Cumulative time display for each split
- [ ] Color coding for performance zones (green/yellow/red)

### 3. Pace Zone Visualization
- [ ] Pace zones defined based on user's average performance
- [ ] Zone breakdown: Easy, Moderate, Hard, Maximum effort
- [ ] Percentage time spent in each zone
- [ ] Visual representation of zone distribution
- [ ] Zone thresholds customizable in settings

### 4. Interactive Chart Features
- [ ] Tap on chart to see exact pace at specific point
- [ ] Zoom functionality for detailed pace analysis
- [ ] Crosshair or marker showing selected data point
- [ ] Tooltip displaying time, distance, and pace information
- [ ] Smooth animations when data loads or changes

### 5. Performance Metrics Summary
- [ ] Best pace segment highlighted (fastest kilometer)
- [ ] Worst pace segment identified (slowest kilometer)
- [ ] Pace consistency metric (standard deviation)
- [ ] Positive/negative split analysis
- [ ] Average pace calculation with clear display

### 6. Visual Design and Accessibility
- [ ] Chart colors accessible for color-blind users
- [ ] Clear axis labels and grid lines
- [ ] Responsive design for different screen sizes
- [ ] Loading states during data processing
- [ ] Error states for invalid or missing data

### 7. Data Processing and Accuracy
- [ ] GPS points processed into meaningful pace segments
- [ ] Outlier pace data filtered (unrealistic speeds)
- [ ] Moving average smoothing for pace calculation
- [ ] Time-based vs distance-based pace options
- [ ] Proper handling of paused segments

### 8. Export and Sharing Features
- [ ] Export pace chart as image
- [ ] Share pace analysis summary
- [ ] Copy statistics to clipboard
- [ ] Integration with run details sharing

## Implementation Details

### Pace Chart Component
```typescript
// src/presentation/components/PaceChartComponent.tsx
export const PaceChartComponent: React.FC<PaceChartProps> = ({
  gpsPoints,
  chartType = 'time',
  onDataPointPress
}) => {
  const paceData = useMemo(() =>
    processPaceData(gpsPoints, chartType), [gpsPoints, chartType]
  );

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={paceData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        onDataPointClick={onDataPointPress}
        withInnerLines={true}
        withOuterLines={true}
        withDots={false}
      />
    </View>
  );
};
```

### Pace Data Processing Service
```typescript
// src/application/services/PaceAnalysisService.ts
export class PaceAnalysisService {
  processGPSDataForPacing(gpsPoints: GPSPoint[]): PaceAnalysis {
    const segments = this.createKilometerSegments(gpsPoints);
    const splits = segments.map(segment => this.calculateSegmentPace(segment));

    return {
      splits,
      fastestSplit: Math.min(...splits),
      slowestSplit: Math.max(...splits),
      averagePace: splits.reduce((sum, pace) => sum + pace, 0) / splits.length,
      paceConsistency: this.calculateStandardDeviation(splits)
    };
  }

  private createKilometerSegments(gpsPoints: GPSPoint[]): GPSPoint[][] {
    const segments: GPSPoint[][] = [];
    let currentSegment: GPSPoint[] = [];
    let distanceAccumulator = 0;

    for (let i = 1; i < gpsPoints.length; i++) {
      const distance = this.calculateDistance(gpsPoints[i-1], gpsPoints[i]);
      distanceAccumulator += distance;
      currentSegment.push(gpsPoints[i]);

      if (distanceAccumulator >= 1000) { // 1 kilometer
        segments.push([...currentSegment]);
        currentSegment = [gpsPoints[i]];
        distanceAccumulator = 0;
      }
    }

    return segments;
  }
}
```

### Split Times Table Component
```typescript
// src/presentation/components/SplitTimesTable.tsx
export const SplitTimesTable: React.FC<{ splits: SplitData[] }> = ({ splits }) => {
  const fastestSplit = Math.min(...splits.map(s => s.pace));
  const slowestSplit = Math.max(...splits.map(s => s.pace));

  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableHeader}>Kilometer Splits</Text>
      {splits.map((split, index) => (
        <SplitRow
          key={index}
          kilometer={index + 1}
          pace={split.pace}
          time={split.time}
          isFastest={split.pace === fastestSplit}
          isSlowest={split.pace === slowestSplit}
        />
      ))}
    </View>
  );
};
```

## Definition of Done

- [ ] Pace chart displays accurately for all run types
- [ ] Kilometer splits calculated and displayed correctly
- [ ] Interactive features work smoothly on iOS devices
- [ ] Performance metrics provide meaningful insights
- [ ] Chart rendering optimized for various data sizes
- [ ] Error handling prevents crashes with invalid data
- [ ] Visual design follows iOS Human Interface Guidelines
- [ ] Component tests verify chart rendering and interactions

## Technical Notes

- Use react-native-chart-kit or similar for chart implementation
- Implement proper data smoothing for GPS noise
- Consider chart performance with very long runs (20+ km)
- Follow iOS accessibility guidelines for chart content

## Dependencies

- **Prerequisite**: Stories 2.1 and 2.3 for run data integration
- **External**: Chart library (react-native-chart-kit)
- **Related**: Story 3.1 for potential route-pace correlation

## Risks

- Chart library compatibility with React Native
- Performance issues with large datasets (3+ hour runs)
- Complex pace calculation accuracy with GPS variations
- User confusion with too many pace metrics displayed