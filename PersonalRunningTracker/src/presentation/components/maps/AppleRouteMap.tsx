import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { RouteMapProps } from './types';

export const AppleRouteMap: React.FC<RouteMapProps> = ({ points, enableAnimation = true }) => {
  const [animating, setAnimating] = useState(false);
  const [animatedCoords, setAnimatedCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(1);
  const mapRef = useRef<MapView>(null);

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
    setProgress(0);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setAnimating(false);
  }, [coords]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const stopAnimation = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setAnimating(false);
  };

  const resetAnimation = () => {
    stopAnimation();
    setAnimatedCoords(coords.length ? [coords[0]] : []);
    indexRef.current = 1;
    setProgress(0);
    // Reset camera to show full route
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 500);
    }
  };

  const startAnimation = () => {
    if (coords.length < 2) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    // If starting fresh
    if (indexRef.current >= coords.length || !animating) {
      setAnimatedCoords([coords[0]]);
      indexRef.current = 1;
      setProgress(0);
    }

    setAnimating(true);

    const SPEED = 20; // time compression factor
    const step = () => {
      const i = indexRef.current;
      if (i >= coords.length) {
        stopAnimation();
        setProgress(100);
        return;
      }

      const newCoords = [...animatedCoords, coords[i]];
      setAnimatedCoords(newCoords);

      // Update progress
      const currentProgress = Math.round((i / (coords.length - 1)) * 100);
      setProgress(currentProgress);

      // Animate camera to follow the current position with a tighter zoom
      const currentPoint = coords[i];
      const lookAheadIndex = Math.min(i + 5, coords.length - 1);
      const lookAheadPoint = coords[lookAheadIndex];

      const newRegion: Region = {
        latitude: (currentPoint.latitude + lookAheadPoint.latitude) / 2,
        longitude: (currentPoint.longitude + lookAheadPoint.longitude) / 2,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      mapRef.current?.animateToRegion(newRegion, 200);

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
          <Text style={styles.noMapText}>No hay datos GPS disponibles</Text>
        </View>
      </View>
    );
  }

  const currentPosition = animatedCoords.length > 0 ? animatedCoords[animatedCoords.length - 1] : null;

  return (
    <View>
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          rotateEnabled={true}
          pitchEnabled={false}
        >
          {/* Gray route showing full path (subtle) */}
          {!animating && (
            <Polyline
              coordinates={coords}
              strokeColor="#FF6B35"
              strokeWidth={4}
              lineJoin="round"
              lineCap="round"
            />
          )}

          {/* Animated orange route showing progress */}
          {animating && animatedCoords.length > 1 && (
            <Polyline
              coordinates={animatedCoords}
              strokeColor="#FF6B35"
              strokeWidth={5}
              lineJoin="round"
              lineCap="round"
            />
          )}

          {/* Faded gray line showing remaining route during animation */}
          {animating && animatedCoords.length < coords.length && (
            <Polyline
              coordinates={coords}
              strokeColor="#CCCCCC"
              strokeWidth={3}
              lineJoin="round"
              lineCap="round"
              lineDashPattern={[1, 10]}
            />
          )}

          {/* Start marker */}
          <Marker
            coordinate={coords[0]}
            title="Inicio"
            pinColor="#4CAF50"
          />

          {/* Finish marker */}
          <Marker
            coordinate={coords[coords.length - 1]}
            title="Final"
            pinColor="#F44336"
          />

          {/* Current position marker during animation */}
          {animating && currentPosition && (
            <Marker
              coordinate={currentPosition}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.currentPositionMarker}>
                <View style={styles.currentPositionDot} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Progress indicator overlay */}
        {animating && (
          <View style={styles.progressOverlay}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}
      </View>

      {enableAnimation && (
        <View style={styles.mapActions}>
          <TouchableOpacity
            style={[styles.animateButton, animating && styles.animateButtonPause]}
            onPress={() => (animating ? stopAnimation() : startAnimation())}
          >
            <Ionicons name={animating ? 'pause' : 'play'} size={16} color="#fff" />
            <Text style={styles.animateButtonText}>
              {animating ? 'Pausar animación' : 'Reproducir recorrido'}
            </Text>
          </TouchableOpacity>

          {(animating || progress > 0) && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetAnimation}
            >
              <Ionicons name="refresh" size={16} color="#666" />
              <Text style={styles.resetButtonText}>Reiniciar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapWrapper: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  map: { flex: 1 },
  noMapData: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  noMapText: { fontSize: 16, color: '#666', marginTop: 12 },
  mapActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  animateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  animateButtonPause: {
    backgroundColor: '#FF9800',
  },
  animateButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resetButtonText: {
    color: '#666',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  currentPositionMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPositionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
  },
  progressOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 36,
    textAlign: 'right',
  },
});

