# Story 2.3: Detailed Run View and Analysis

**Epic**: Core Run Tracking Features
**Story ID**: 2.3
**Priority**: Must Have
**Estimated Effort**: 7-9 hours

## User Story

As a user,
I want to view detailed information about a specific run including route map and pace analysis,
so that I can analyze my performance and review my running route.

## Acceptance Criteria

### 1. Run Details Header
- [x] Run name displayed prominently with edit capability
- [x] Run date and time formatted clearly
- [ ] Weather conditions display (if available from device)
- [x] Run notes section with edit functionality
- [x] Share button for basic run statistics

### 2. Key Metrics Display
- [x] Large, prominent display of primary metrics
- [x] Total distance in kilometers (2 decimal places)
- [x] Total duration in HH:MM:SS format
- [x] Average pace in MM:SS per kilometer
- [ ] Elevation gain/loss (if GPS provides altitude data)
- [x] Calories burned estimate based on distance and pace

### 3. Route Map Visualization
- [x] Interactive map showing complete GPS route
- [x] Route path drawn as colored line on map
- [x] Start and finish markers clearly indicated
- [x] Map centered on route with appropriate zoom level
- [ ] Satellite/street view toggle options

### 4. Pace Analysis Section
- [ ] Pace graph showing speed variations throughout run
- [x] Kilometer split times displayed in table format
- [x] Fastest and slowest kilometer highlighted
- [ ] Moving average pace calculation and display
- [ ] Pace zone analysis (if pace zones defined)

### 5. GPS Data Quality Information
- [ ] GPS tracking quality indicators
- [ ] Total GPS points captured during run
- [ ] Average GPS accuracy throughout session
- [ ] Signal loss periods highlighted (if any)

### 6. Data Export and Sharing
- [ ] Export run data to GPX format
- [ ] Share basic statistics as text/image
- [ ] Copy run summary to clipboard
- [ ] Save route as favorite (for future reference)

### 7. Run Management Actions
- [x] Edit run name and notes functionality
- [x] Delete run with confirmation dialog
- [ ] Duplicate run for template usage
- [ ] Mark run as personal record (if applicable)

### 8. Performance and Loading
- [ ] Screen loads within 3 seconds for typical runs
- [ ] Map renders progressively for better user experience
- [ ] GPS data processing optimized for large datasets
- [ ] Smooth scrolling through different detail sections

## Implementation Details

### Details Screen Structure
```typescript
// src/presentation/screens/RunDetailsScreen.tsx
export const RunDetailsScreen: React.FC<{ route: RouteProp<...> }> = ({ route }) => {
  const { runId } = route.params;
  const controller = useRunDetailsController(runId);

  return (
    <RunDetailsScreenView
      run={controller.run}
      isLoading={controller.isLoading}
      onEdit={controller.editRun}
      onDelete={controller.deleteRun}
      onShare={controller.shareRun}
      onExport={controller.exportRun}
    />
  );
};
```

### Route Map Component
```typescript
// src/presentation/components/RouteMapView.tsx
export const RouteMapView: React.FC<{ gpsPoints: GPSPoint[] }> = ({ gpsPoints }) => {
  const mapRegion = useMemo(() => calculateMapRegion(gpsPoints), [gpsPoints]);

  return (
    <MapView
      style={styles.map}
      region={mapRegion}
      showsUserLocation={false}
    >
      <Polyline
        coordinates={gpsPoints.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude
        }))}
        strokeColor="#FF6B35"
        strokeWidth={4}
      />
      <Marker coordinate={gpsPoints[0]} title="Start" />
      <Marker coordinate={gpsPoints[gpsPoints.length - 1]} title="Finish" />
    </MapView>
  );
};
```

### Pace Analysis Component
```typescript
// src/presentation/components/PaceAnalysisView.tsx
export const PaceAnalysisView: React.FC<{ run: Run }> = ({ run }) => {
  const paceData = useMemo(() => calculateKilometerSplits(run), [run]);

  return (
    <View>
      <PaceChart data={paceData} />
      <SplitTimesTable splits={paceData.splits} />
    </View>
  );
};
```

### GPX Export Service
```typescript
// src/infrastructure/export/GPXExportService.ts
export class GPXExportService implements IExportService {
  async exportToGPX(run: Run): Promise<Result<string, ExportError>> {
    const gpxContent = this.generateGPXContent(run);
    return Ok(gpxContent);
  }

  private generateGPXContent(run: Run): string {
    // GPX format generation with XML structure
    return `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1" creator="PersonalRunningTracker">
        <trk>
          <name>${run.name}</name>
          <trkseg>
            ${run.routeData.map(point =>
              `<trkpt lat="${point.latitude}" lon="${point.longitude}">
                <time>${point.timestamp.toISOString()}</time>
              </trkpt>`
            ).join('')}
          </trkseg>
        </trk>
      </gpx>`;
  }
}
```

## Definition of Done

- [ ] All run details display accurately and completely
- [ ] Route map renders correctly with proper route visualization
- [ ] Pace analysis provides meaningful insights
- [ ] Edit functionality works for name and notes
- [ ] Export to GPX format functions properly
- [ ] Share functionality creates appropriate content
- [ ] Delete operation works with proper confirmation
- [ ] Performance meets requirements for large GPS datasets
- [ ] Component tests verify all interactions and data display

## Technical Notes

- Use react-native-maps for route visualization
- Implement proper map region calculation for optimal zoom
- Consider GPS point simplification for performance
- Use chart library (react-native-chart-kit) for pace visualization

## Dependencies

- **Prerequisite**: Stories 2.1 and 2.2 must be completed
- **Integration**: Database repository for run retrieval and updates
- **External**: react-native-maps for map functionality

## Risks

- Map rendering performance with large GPS datasets
- Complex pace calculation accuracy
- GPS data corruption affecting map display
- Memory usage from map tiles and GPS data
- Export functionality compatibility across iOS versions