import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { GPSPoint } from '@/domain/entities';

type Props = {
  points: GPSPoint[];
  currentLocation?: GPSPoint;
  height?: number;
  showCurrentLocation?: boolean;
  isTracking?: boolean;
};

// Projects latitude/longitude into view coordinates
function useProject(points: GPSPoint[], width: number, height: number, padding = 20) {
  return useMemo(() => {
    if (!points || points.length === 0) {
      return { project: (_: GPSPoint) => ({ x: width / 2, y: height / 2 }) };
    }

    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add some padding to bounds
    const spanLat = Math.max(maxLat - minLat, 0.001);
    const spanLng = Math.max(maxLng - minLng, 0.001);

    const innerW = Math.max(1, width - padding * 2);
    const innerH = Math.max(1, height - padding * 2);

    // Calculate scale to fit route in view
    const scale = Math.min(innerW / spanLng, innerH / spanLat);
    const offsetX = (width - scale * spanLng) / 2;
    const offsetY = (height - scale * spanLat) / 2;

    const project = (p: GPSPoint) => {
      const x = offsetX + (p.longitude - minLng) * scale;
      const y = height - (offsetY + (p.latitude - minLat) * scale);
      return { x, y };
    };

    return { project };
  }, [points, width, height, padding]);
}

export const LiveTrackingMap: React.FC<Props> = ({
  points,
  currentLocation,
  height = 200,
  showCurrentLocation = true,
  isTracking = false
}) => {
  const { width } = Dimensions.get('window');
  const mapWidth = width - 32; // 16px margin on each side
  const { project } = useProject(points, mapWidth, height);

  // Animation for the current location pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animate current location indicator
  useEffect(() => {
    if (isTracking && showCurrentLocation) {
      // Smooth pulsing animation (like iPhone Maps)
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      );

      // Subtle rotation animation
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      );

      pulse.start();
      rotate.start();

      return () => {
        pulse.stop();
        rotate.stop();
      };
    } else {
      // Reset animations when not tracking
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [isTracking, showCurrentLocation, pulseAnim, rotateAnim]);

  // Generate polyline coordinates
  const routeCoords = useMemo(() => {
    if (points.length < 2) return '';

    return points.map(p => {
      const { x, y } = project(p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [points, project]);

  // Get current location coordinates
  const currentLocationCoords = useMemo(() => {
    if (!currentLocation) return null;
    return project(currentLocation);
  }, [currentLocation, project]);

  if (points.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.emptyState}>
          <Circle cx={mapWidth / 2} cy={height / 2} r="4" fill="#FF6B35" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={mapWidth} height={height} style={styles.svg}>
        <Defs>
          {/* Gradient for the route line (iPhone Maps orange style) */}
          <LinearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF9F40" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FF6B35" stopOpacity="1" />
            <Stop offset="100%" stopColor="#E55B2B" stopOpacity="1" />
          </LinearGradient>

          {/* Gradient for the route shadow */}
          <LinearGradient id="routeShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0.15" />
          </LinearGradient>
        </Defs>

        {/* Route shadow/outline */}
        {routeCoords && (
          <Polyline
            points={routeCoords}
            fill="none"
            stroke="url(#routeShadow)"
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Main route line */}
        {routeCoords && (
          <Polyline
            points={routeCoords}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Start point */}
        {points.length > 0 && (
          (() => {
            const startPoint = project(points[0]);
            return (
              <>
                <Circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r="8"
                  fill="#4CAF50"
                  stroke="#fff"
                  strokeWidth="2"
                />
                <Circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r="4"
                  fill="#fff"
                />
              </>
            );
          })()
        )}

        {/* Current location indicator */}
        {showCurrentLocation && currentLocationCoords && (
          <>
            {/* Outer pulsing circle (animated) */}
            <Circle
              cx={currentLocationCoords.x}
              cy={currentLocationCoords.y}
              r="25"
              fill="#FF6B35"
              fillOpacity="0.15"
            />

            {/* Middle pulsing circle */}
            <Circle
              cx={currentLocationCoords.x}
              cy={currentLocationCoords.y}
              r="18"
              fill="#FF6B35"
              fillOpacity="0.25"
            />

            {/* Direction indicator ring */}
            <Circle
              cx={currentLocationCoords.x}
              cy={currentLocationCoords.y}
              r="12"
              fill="none"
              stroke="#FF6B35"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />

            {/* Main location dot with white border (iPhone Maps style) */}
            <Circle
              cx={currentLocationCoords.x}
              cy={currentLocationCoords.y}
              r="8"
              fill="#FF6B35"
              stroke="#fff"
              strokeWidth="3"
            />

            {/* Center white dot */}
            <Circle
              cx={currentLocationCoords.x}
              cy={currentLocationCoords.y}
              r="3"
              fill="#fff"
            />
          </>
        )}
      </Svg>

      {/* Distance markers overlay */}
      {isTracking && (
        <View style={styles.overlayInfo}>
          <View style={styles.distanceChip}>
            <View style={styles.distanceDot} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7f8fb', // iPhone Maps background color
    borderRadius: 20, // More rounded like iPhone Maps
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  svg: {
    backgroundColor: 'transparent',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f8fb',
  },
  overlayInfo: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  distanceChip: {
    backgroundColor: 'rgba(255, 107, 53, 0.95)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  distanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});

export default LiveTrackingMap;