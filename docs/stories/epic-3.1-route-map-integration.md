# Story 3.1: Route Map Integration and Visualization

**Epic**: Route Visualization & Maps
**Story ID**: 3.1
**Priority**: Should Have
**Estimated Effort**: 8-10 hours

## User Story

As a user,
I want to see my running routes displayed on interactive maps with GPS tracking visualization,
so that I can visualize where I ran and analyze my route choices.

## Acceptance Criteria

### 1. Map Component Integration
- [ ] react-native-maps integrated with proper iOS configuration
- [x] Map component displays correctly in run details screen (static preview in Expo Go)
- [x] Map renders within 3 seconds for typical routes (static preview)
- [x] Proper error handling for map loading failures / fallbacks
- [x] Fallback display when maps are unavailable (Expo Go static image)

### 2. GPS Route Visualization
- [x] Complete GPS route drawn as colored polyline (orange)
- [ ] Route color customizable (default: orange/red)
- [x] Line thickness appropriate for readability (4-6px)
- [x] Route segments connected properly without gaps
- [x] Start and finish points marked with distinct markers

### 3. Map Region and Zoom
- [x] Map automatically centers on route with optimal zoom (static preview)
- [x] Route fits completely within view with comfortable padding
- [x] Map region calculated from GPS bounds (min/max lat/lng)
- [ ] User can zoom and pan to explore route details
- [ ] Reset zoom button returns to optimal route view

### 4. Interactive Map Features
- [ ] Tap on route shows pace/speed at that location
- [ ] Pinch to zoom and pan gestures work smoothly
- [ ] Map type toggle (standard, satellite, hybrid)
- [ ] Current location button (when relevant)
- [ ] Map follows device rotation properly

### 5. Performance Optimization
- [ ] GPS points simplified for large datasets (>1000 points)
- [ ] Map tiles cached for offline viewing
- [ ] Memory usage optimized for extended map interaction
- [ ] Smooth rendering for routes with dense GPS data
- [ ] Background loading doesn't block UI interactions

### 6. Route Analysis Visual Enhancements
- [ ] Pace-based color coding for route segments
- [ ] Elevation changes represented visually (if available)
- [ ] Kilometer markers along the route
- [ ] Direction indicators showing running direction
- [ ] Speed variations highlighted with different colors

### 7. Map Data and Accuracy
- [ ] GPS accuracy represented in route quality
- [ ] Poor GPS signal areas identified visually
- [ ] Route smoothing for GPS noise reduction
- [ ] Gaps in GPS data handled gracefully
- [ ] Invalid GPS points filtered out

### 8. Error Handling and Edge Cases
- [x] No GPS data scenarios handled with appropriate message
- [x] Map service failures handled gracefully
- [x] Very short routes (under 100m) displayed properly
- [ ] Routes with significant gaps shown correctly
- [x] Corrupt GPS data filtered and user notified

## Implementation Details

### Map Component Structure
```typescript
// src/presentation/components/RouteMapComponent.tsx
export const RouteMapComponent: React.FC<RouteMapProps> = ({
  gpsPoints,
  onRoutePress,
  mapType = 'standard'
}) => {
  const mapRegion = useMemo(() => calculateOptimalRegion(gpsPoints), [gpsPoints]);
  const simplifiedRoute = useMemo(() => simplifyRoute(gpsPoints), [gpsPoints]);

  return (
    <MapView
      style={styles.map}
      region={mapRegion}
      mapType={mapType}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      <RoutePolyline
        coordinates={simplifiedRoute}
        onPress={onRoutePress}
      />
      <RouteMarkers
        start={gpsPoints[0]}
        finish={gpsPoints[gpsPoints.length - 1]}
      />
    </MapView>
  );
};
```

### Route Simplification Service
```typescript
// src/infrastructure/maps/RouteSimplificationService.ts
export class RouteSimplificationService {
  simplifyRoute(points: GPSPoint[], tolerance: number = 0.0001): GPSPoint[] {
    if (points.length <= 100) return points;

    // Douglas-Peucker algorithm for route simplification
    return this.douglasPeucker(points, tolerance);
  }

  private douglasPeucker(points: GPSPoint[], tolerance: number): GPSPoint[] {
    // Implementation of line simplification algorithm
  }
}
```

### Map Region Calculation
```typescript
// src/presentation/utils/MapRegionCalculator.ts
export class MapRegionCalculator {
  static calculateOptimalRegion(gpsPoints: GPSPoint[]): Region {
    if (gpsPoints.length === 0) return DEFAULT_REGION;

    const latitudes = gpsPoints.map(p => p.latitude);
    const longitudes = gpsPoints.map(p => p.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const padding = 0.001; // Comfortable padding around route

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) + padding,
      longitudeDelta: (maxLng - minLng) + padding
    };
  }
}
```

## Definition of Done

- [ ] Maps display correctly on iOS devices
- [ ] GPS routes render accurately with proper visualization
- [ ] Map performance acceptable for large routes (1000+ GPS points)
- [ ] Interactive features work smoothly (zoom, pan, tap)
- [ ] Route analysis visual enhancements implemented
- [ ] Error scenarios handled with user-friendly feedback
- [ ] Memory usage optimized for extended map usage
- [ ] Component tests verify map rendering and interactions

## Technical Notes

- Configure react-native-maps with proper iOS permissions
- Use route simplification for performance with large datasets
- Implement proper map tile caching strategy
- Consider MapKit (iOS) native integration for better performance

## Dependencies

- **Prerequisite**: Story 2.3 (Run Details View) for integration
- **External**: react-native-maps library properly configured
- **Platform**: iOS location and maps permissions

## Risks

- react-native-maps configuration complexity
- Performance issues with very large GPS datasets
- Memory usage from map tiles and route rendering
- iOS maps service limitations or restrictions
- GPS data quality affecting route visualization accuracy
