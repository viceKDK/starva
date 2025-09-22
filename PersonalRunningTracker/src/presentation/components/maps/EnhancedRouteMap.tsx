import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils/GeoUtils';
import { RouteSimplificationService } from '@/infrastructure/maps/RouteSimplificationService';

export interface EnhancedRouteMapProps {
  points: GPSPoint[];
  mapType?: 'standard' | 'satellite';
  showPaceColors?: boolean;
  showElevation?: boolean;
  showKilometerMarkers?: boolean;
  routeColor?: string;
}

export const EnhancedRouteMap: React.FC<EnhancedRouteMapProps> = ({
  points,
  mapType = 'standard',
  showPaceColors = false,
  showElevation = false,
  showKilometerMarkers = false,
  routeColor = '#FF6B35'
}) => {
  let MapView: any, Marker: any, Polyline: any;
  try {
    const EM = require('expo-maps');
    MapView = EM.MapView;
    Marker = EM.Marker;
    Polyline = EM.Polyline;
  } catch (e) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Enhanced map not available</Text>
      </View>
    );
  }

  // Simplify route for better performance
  const simplifiedPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    const config = RouteSimplificationService.getOptimalConfig(points);
    return RouteSimplificationService.simplifyRoute(points, config);
  }, [points]);

  // Calculate pace-based color segments
  const paceSegments = useMemo(() => {
    if (!showPaceColors || simplifiedPoints.length < 2) return [];

    const segments = [];
    for (let i = 1; i < simplifiedPoints.length; i++) {
      const prev = simplifiedPoints[i - 1];
      const curr = simplifiedPoints[i];

      const distance = GeoUtils.calculateDistance(prev, curr, { precision: -1 });
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      const pace = timeDiff > 0 && distance > 0 ? timeDiff / (distance / 1000) : 0;

      // Color coding based on pace (adjust thresholds as needed)
      let color = routeColor;
      if (pace > 0) {
        if (pace < 300) color = '#00FF00'; // Fast (green)
        else if (pace < 360) color = '#FFFF00'; // Moderate (yellow)
        else if (pace < 420) color = '#FFA500'; // Slow (orange)
        else color = '#FF0000'; // Very slow (red)
      }

      segments.push({
        coordinates: [
          { latitude: prev.latitude, longitude: prev.longitude },
          { latitude: curr.latitude, longitude: curr.longitude }
        ],
        color,
        pace
      });
    }
    return segments;
  }, [simplifiedPoints, showPaceColors, routeColor]);

  // Calculate kilometer markers
  const kilometerMarkers = useMemo(() => {
    if (!showKilometerMarkers || points.length < 2) return [];

    const markers = [];
    let totalDistance = 0;
    let currentKm = 1;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const segmentDistance = GeoUtils.calculateDistance(prev, curr, { precision: -1 });
      totalDistance += segmentDistance;

      if (totalDistance >= currentKm * 1000) {
        markers.push({
          coordinate: { latitude: curr.latitude, longitude: curr.longitude },
          title: `${currentKm}K`,
          id: `km-${currentKm}`
        });
        currentKm++;
      }
    }
    return markers;
  }, [points, showKilometerMarkers]);

  // Elevation analysis
  const elevationInfo = useMemo(() => {
    if (!showElevation) return null;

    const elevations = points
      .map(p => p.altitude || 0)
      .filter(alt => alt > 0);

    if (elevations.length === 0) return null;

    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    let totalGain = 0;
    let totalLoss = 0;

    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) totalGain += diff;
      else totalLoss += Math.abs(diff);
    }

    return {
      min: minElevation,
      max: maxElevation,
      gain: totalGain,
      loss: totalLoss
    };
  }, [points, showElevation]);

  const optimalRegion = useMemo(() => {
    if (!simplifiedPoints || simplifiedPoints.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    const bb = GeoUtils.calculateBoundingBox(simplifiedPoints, 0.2);
    return {
      latitude: bb.centerLatitude,
      longitude: bb.centerLongitude,
      latitudeDelta: bb.latitudeDelta,
      longitudeDelta: bb.longitudeDelta,
    };
  }, [simplifiedPoints]);

  const [mapKey, setMapKey] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<{ pace: number; color: string } | null>(null);

  const resetView = useCallback(() => {
    setMapKey(k => k + 1);
    setSelectedSegment(null);
  }, []);

  const onMapPress = useCallback(() => {
    setSelectedSegment(null);
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        key={mapKey}
        style={styles.map}
        initialRegion={optimalRegion}
        mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
        onPress={onMapPress}
      >
        {/* Render pace-colored segments or single polyline */}
        {showPaceColors ? (
          paceSegments.map((segment, index) => (
            <Polyline
              key={`segment-${index}`}
              coordinates={segment.coordinates}
              strokeColor={segment.color}
              strokeWidth={4}
              onPress={() => setSelectedSegment({ pace: segment.pace, color: segment.color })}
            />
          ))
        ) : (
          simplifiedPoints.length > 1 && (
            <Polyline
              coordinates={simplifiedPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
              strokeColor={routeColor}
              strokeWidth={4}
            />
          )
        )}

        {/* Start and finish markers */}
        {points.length > 0 && (
          <Marker
            coordinate={{ latitude: points[0].latitude, longitude: points[0].longitude }}
            title="Start"
          />
        )}
        {points.length > 1 && (
          <Marker
            coordinate={{
              latitude: points[points.length - 1].latitude,
              longitude: points[points.length - 1].longitude
            }}
            title="Finish"
          />
        )}

        {/* Kilometer markers */}
        {kilometerMarkers.map(marker => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
          />
        ))}
      </MapView>

      {/* Controls and information panel */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={styles.controlButton} onPress={resetView}>
            <Text style={styles.controlText}>Reset View</Text>
          </TouchableOpacity>

          {elevationInfo && (
            <View style={styles.elevationInfo}>
              <Text style={styles.elevationText}>
                ↗ {Math.round(elevationInfo.gain)}m ↘ {Math.round(elevationInfo.loss)}m
              </Text>
            </View>
          )}
        </ScrollView>

        {selectedSegment && (
          <View style={styles.segmentInfo}>
            <Text style={styles.segmentText}>
              Pace: {Math.floor(selectedSegment.pace / 60)}:{Math.floor(selectedSegment.pace % 60).toString().padStart(2, '0')}/km
            </Text>
          </View>
        )}
      </View>

      {/* Pace legend */}
      {showPaceColors && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Pace Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#00FF00' }]} />
              <Text style={styles.legendText}>Fast (&lt;5:00/km)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FFFF00' }]} />
              <Text style={styles.legendText}>Moderate (5:00-6:00/km)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FFA500' }]} />
              <Text style={styles.legendText}>Slow (6:00-7:00/km)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF0000' }]} />
              <Text style={styles.legendText}>Very slow (&gt;7:00/km)</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  map: {
    flex: 1,
  },
  placeholder: {
    height: 300,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f2f2',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  controlsContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  controlText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  elevationInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  elevationText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  segmentInfo: {
    position: 'absolute',
    bottom: -35,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  segmentText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 10,
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 3,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    flex: 1,
  },
});