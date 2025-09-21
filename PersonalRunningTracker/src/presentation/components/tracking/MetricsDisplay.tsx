import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    <View style={styles.container}>
      <View style={styles.primaryMetric}>
        <Text style={styles.primaryValue}>{formatDuration(metrics.duration)}</Text>
        <Text style={styles.primaryLabel}>Duration</Text>
      </View>

      <View style={styles.secondaryMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.secondaryValue}>{getFormattedDistance()}</Text>
          <Text style={styles.secondaryLabel}>{getDistanceUnit() ?? ''}</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.secondaryValue}>{getFormattedPace()}</Text>
          <Text style={styles.secondaryLabel}>{getPaceLabel() ?? ''}</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.secondaryValue}>{formatSpeed(metrics.currentSpeed)}</Text>
          <Text style={styles.secondaryLabel}>km/h</Text>
        </View>
      </View>

      {isTracking && (
        <View style={styles.trackingIndicator}>
          <View style={styles.pulse} />
          <Text style={styles.trackingText}>Tracking</Text>
        </View>
      )}
    </View>
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
    fontSize: 48,
    fontWeight: '300',
    color: '#FF6B35',
    fontVariant: ['tabular-nums']
  },
  primaryLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  secondaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
    marginBottom: 20
  },
  metricItem: {
    alignItems: 'center',
    flex: 1
  },
  secondaryValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    fontVariant: ['tabular-nums']
  },
  secondaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 8,
    opacity: 0.9
  },
  trackingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1
  }
});
