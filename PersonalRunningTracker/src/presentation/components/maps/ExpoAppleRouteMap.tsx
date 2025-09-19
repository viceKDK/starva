import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RouteMapProps } from './types';

// This component prefers expo-maps (Apple Maps on iOS) when available.
// If expo-maps isn't installed (e.g., running in Expo Go without a dev build),
// the caller should fall back to a static preview.

export const ExpoAppleRouteMap: React.FC<RouteMapProps> = ({ points }) => {
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

  const region = useMemo(() => {
    if (!points || points.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const dLat = Math.max((maxLat - minLat) * 1.2, 0.01);
    const dLng = Math.max((maxLng - minLng) * 1.2, 0.01);
    return { latitude: centerLat, longitude: centerLng, latitudeDelta: dLat, longitudeDelta: dLng };
  }, [points]);

  const coords = useMemo(() => points.map(p => ({ latitude: p.latitude, longitude: p.longitude })), [points]);

  return (
    <View style={styles.wrapper}>
      <MapView style={styles.map} region={region} mapType="standard">
        {coords.length > 1 && (
          <Polyline coordinates={coords} strokeColor="#FF6B35" strokeWidth={4} />
        )}
        {coords.length > 0 && (
          <Marker coordinate={coords[0]} title="Start" />
        )}
        {coords.length > 1 && (
          <Marker coordinate={coords[coords.length - 1]} title="Finish" />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { height: 200, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  placeholder: { height: 200, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f2' },
  placeholderText: { color: '#666' },
});

