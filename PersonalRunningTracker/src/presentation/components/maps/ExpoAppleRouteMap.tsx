import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { RouteMapProps } from './types';
import { GeoUtils } from '@/shared/utils/GeoUtils';
import { RouteSimplificationService } from '@/infrastructure/maps/RouteSimplificationService';

// This component prefers expo-maps (Apple Maps on iOS) when available.
// If expo-maps isn't installed (e.g., running in Expo Go without a dev build),
// the caller should fall back to a static preview.

export const ExpoAppleRouteMap: React.FC<RouteMapProps> = ({ points, mapType, routeColor }) => {
  let MapView: any, Marker: any, Polyline: any;
  try {
    const EM = require('expo-maps');
    MapView = EM.MapView;
    Marker = EM.Marker;
    Polyline = EM.Polyline;
  } catch (e) {
    // Not available; render a placeholder so the caller can decide to fallback
    return (
      <View style={styles.placeholder}> 
        <Text style={styles.placeholderText}>Map module not available</Text>
      </View>
    );
  }

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
  const resetView = useCallback(() => setMapKey(k => k + 1), []);

  // Simplify route for better performance
  const simplifiedPoints = useMemo(() => {
    if (!points || points.length === 0) return [];

    const config = RouteSimplificationService.getOptimalConfig(points);
    return RouteSimplificationService.simplifyRoute(points, config);
  }, [points]);

  const coords = useMemo(() =>
    simplifiedPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
    [simplifiedPoints]
  );

  // Tap-to-show pace marker
  const [pin, setPin] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const onMapPress = useCallback((e: any) => {
    if (!points || points.length < 2) return;
    const { latitude, longitude } = e?.nativeEvent?.coordinate || {};
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
    let nearestIdx = 0;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i++) {
      const dLat = points[i]!.latitude - latitude;
      const dLng = points[i]!.longitude - longitude;
      const dist2 = dLat * dLat + dLng * dLng;
      if (dist2 < best) {
        best = dist2;
        nearestIdx = i;
      }
    }
    const i2 = Math.max(1, Math.min(points.length - 1, nearestIdx));
    const a = points[i2 - 1]!;
    const b = points[i2]!;
    const meters = GeoUtils.calculateDistance(a, b, { precision: -1 });
    const secs = (b.timestamp.getTime() - a.timestamp.getTime()) / 1000;
    const paceSecPerKm = meters > 0 && secs > 0 ? secs / (meters / 1000) : 0;
    const mm = Math.floor(paceSecPerKm / 60);
    const ss = Math.max(0, Math.floor(paceSecPerKm % 60));
    const label = paceSecPerKm > 0 ? `${mm}:${ss.toString().padStart(2, '0')}/km` : '--:--/km';
    setPin({ lat: b.latitude, lng: b.longitude, label });
  }, [points]);

  return (
    <View style={styles.wrapper}>
      <MapView
        key={mapKey}
        style={styles.map}
        initialRegion={optimalRegion}
        mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
        onPress={onMapPress}
      >
        {coords.length > 1 && (
          <Polyline coordinates={coords} strokeColor={routeColor || '#FF6B35'} strokeWidth={4} />
        )}
        {coords.length > 0 && (
          <Marker coordinate={coords[0]} title="Start" />
        )}
        {coords.length > 1 && (
          <Marker coordinate={coords[coords.length - 1]} title="Finish" />
        )}
        {pin && (
          <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} title={pin.label} />
        )}
      </MapView>
      <View style={styles.fabRow}>
        <TouchableOpacity style={styles.fab} onPress={resetView}>
          <Text style={styles.fabText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { height: 200, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  placeholder: { height: 200, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f2' },
  placeholderText: { color: '#666' },
  fabRow: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row' },
  fab: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  fabText: { color: '#fff', fontWeight: '600' },
});
