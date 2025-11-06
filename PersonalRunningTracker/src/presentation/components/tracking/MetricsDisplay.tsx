import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RunMetrics } from '../../controllers/RunTrackingController';
import { useUserPreferences } from '../../hooks/useUserPreferences';

interface MetricsDisplayProps {
  metrics: RunMetrics;
  isTracking: boolean;
}

export const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  metrics,
  isTracking
}) => {
  const { formatDistance, formatPace, getDistanceUnit, getPaceLabel } = useUserPreferences();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Pulse animation for tracking indicator
  useEffect(() => {
    if (isTracking) {
      // Fade in and scale up on start
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();

      // Continuous pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      // Fade out on pause
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isTracking, pulseAnim, fadeAnim, scaleAnim]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFormattedDistance = (): string => {
    const parts = formatDistance(metrics.distance).split(' ');
    return (parts[0] ?? ''); // Just the number, we'll add unit in the label
  };

  const getFormattedPace = (): string => {
    if (metrics.pace === 0 || !isFinite(metrics.pace)) {
      return '--:--';
    }
    const parts = formatPace(metrics.pace).split(' ');
    return (parts[0] ?? ''); // Just the pace, we'll add unit in the label
  };

  const formatSpeed = (metersPerSecond: number): string => {
    const kmh = (metersPerSecond * 3.6);
    return kmh.toFixed(1);
  };

  return (
    <Animated.View style={[styles.container, { opacity: scaleAnim }]}>
      <View style={styles.primaryMetric}>
        <Text style={styles.primaryValue}>{formatDuration(metrics.duration)}</Text>
        <Text style={styles.primaryLabel}>Duration</Text>
      </View>

      <View style={styles.secondaryMetrics}>
        <View style={styles.metricItem}>
          <View style={[styles.metricCard, isTracking && styles.metricCardActive]}>
            <Text style={styles.secondaryValue}>{getFormattedDistance()}</Text>
            <Text style={styles.secondaryLabel}>{getDistanceUnit() ?? ''}</Text>
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={[styles.metricCard, isTracking && styles.metricCardActive]}>
            <Text style={styles.secondaryValue}>{getFormattedPace()}</Text>
            <Text style={styles.secondaryLabel}>{getPaceLabel() ?? ''}</Text>
          </View>
        </View>

        <View style={styles.metricItem}>
          <View style={[styles.metricCard, isTracking && styles.metricCardActive]}>
            <Text style={styles.secondaryValue}>{formatSpeed(metrics.currentSpeed)}</Text>
            <Text style={styles.secondaryLabel}>km/h</Text>
          </View>
        </View>
      </View>

      {isTracking && (
        <Animated.View style={[
          styles.trackingIndicator,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <Animated.View style={[
            styles.pulse,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]} />
          <Text style={styles.trackingText}>Recording</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center'
  },
  primaryMetric: {
    alignItems: 'center',
    marginBottom: 30
  },
  primaryValue: {
    fontSize: 56,
    fontWeight: '200',
    color: '#FF6B35',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1
  },
  primaryLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '500'
  },
  secondaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 20,
    gap: 12
  },
  metricItem: {
    flex: 1,
    alignItems: 'center'
  },
  metricCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  metricCardActive: {
    backgroundColor: '#fff',
    borderColor: '#FF6B35',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  secondaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5
  },
  secondaryLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600'
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  pulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginRight: 10
  },
  trackingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5
  }
});
