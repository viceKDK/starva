import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { RouteMapProps } from './types';

export const AppleRouteMap: React.FC<RouteMapProps> = ({ points, enableAnimation = true }) => {
  const [animating, setAnimating] = useState(false);
  const [animatedCoords, setAnimatedCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(1);

  const region = useMemo(() => {
    if (points.length === 0) {
      return { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.0922, longitudeDelta: 0.0421 };
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

  useEffect(() => {
    setAnimatedCoords(coords.length ? [coords[0]] : []);
    indexRef.current = 1;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setAnimating(false);
  }, [coords]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const stopAnimation = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setAnimating(false);
  };

  const startAnimation = () => {
    if (coords.length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnimatedCoords([coords[0]]);
    indexRef.current = 1;
    setAnimating(true);

    const SPEED = 20; // time compression factor
    const step = () => {
      const i = indexRef.current;
      if (i >= coords.length) { stopAnimation(); return; }
      setAnimatedCoords(prev => [...prev, coords[i]]);
      const t1 = points[i - 1].timestamp.getTime();
      const t2 = points[i].timestamp.getTime();
      const delay = Math.max(50, Math.floor(Math.max(0, t2 - t1) / SPEED));
      indexRef.current = i + 1;
      timerRef.current = setTimeout(step, delay);
    };
    timerRef.current = setTimeout(step, 300);
  };

  if (points.length === 0) {
    return (
      <View>
        <View style={styles.noMapData}>
          <Ionicons name="map-outline" size={48} color="#ccc" />
          <Text style={styles.noMapText}>No GPS data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.mapWrapper}>
        <MapView style={styles.map} region={region} showsUserLocation={false} showsMyLocationButton={false} showsCompass={false}>
          <Polyline coordinates={coords} strokeColor="#FF6B35" strokeWidth={4} lineJoin="round" lineCap="round" />
          {animatedCoords.length > 1 && (
            <Polyline coordinates={animatedCoords} strokeColor="#2196F3" strokeWidth={5} lineJoin="round" lineCap="round" />
          )}
          <Marker coordinate={coords[0]} title="Start" pinColor="#4CAF50" />
          <Marker coordinate={coords[coords.length - 1]} title="Finish" pinColor="#F44336" />
        </MapView>
      </View>

      {enableAnimation && (
        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.animateButton} onPress={() => (animating ? stopAnimation() : startAnimation())}>
            <Ionicons name={animating ? 'pause' : 'play'} size={16} color="#fff" />
            <Text style={styles.animateButtonText}>{animating ? 'Detener animación' : 'Ver recorrido'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapWrapper: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  map: { flex: 1 },
  noMapData: { height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12 },
  noMapText: { fontSize: 16, color: '#666', marginTop: 12 },
  mapActions: { marginTop: 4, alignItems: 'flex-start' },
  animateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  animateButtonText: { color: '#fff', marginLeft: 6, fontSize: 14, fontWeight: '600' },
});

