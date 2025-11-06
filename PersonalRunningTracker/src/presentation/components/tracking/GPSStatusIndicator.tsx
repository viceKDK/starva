import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GPSStatus } from '../../controllers/RunTrackingController';

interface GPSStatusIndicatorProps {
  status: GPSStatus;
  accuracy: number | null;
  error?: string | null;
}

export const GPSStatusIndicator: React.FC<GPSStatusIndicatorProps> = ({
  status,
  accuracy,
  error
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case GPSStatus.EXCELLENT:
        return {
          icon: 'radio' as const,
          color: '#4CAF50',
          text: 'Excellent GPS',
          showAccuracy: true
        };
      case GPSStatus.GOOD:
        return {
          icon: 'radio' as const,
          color: '#8BC34A',
          text: 'Good GPS',
          showAccuracy: true
        };
      case GPSStatus.WEAK:
        return {
          icon: 'radio' as const,
          color: '#FF9800',
          text: 'Weak GPS',
          showAccuracy: true
        };
      case GPSStatus.ACQUIRING:
        return {
          icon: 'refresh' as const,
          color: '#2196F3',
          text: 'Acquiring GPS...',
          showAccuracy: false
        };
      case GPSStatus.ERROR:
        return {
          icon: 'warning' as const,
          color: '#F44336',
          text: 'GPS Error',
          showAccuracy: false
        };
      default:
        return {
          icon: 'help' as const,
          color: '#666',
          text: 'GPS Unknown',
          showAccuracy: false
        };
    }
  };

  const statusInfo = getStatusInfo();

  const formatAccuracy = (acc: number): string => {
    return `+/-${Math.round(acc)}m`;
  };

  const shouldShowWarning = () => {
    return accuracy !== null && accuracy > 15;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusRow, error && styles.errorState]}>
        <Ionicons
          name={statusInfo.icon}
          size={16}
          color={statusInfo.color}
        />
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
        {statusInfo.showAccuracy && accuracy !== null && (
          <Text style={styles.accuracyText}>
            {formatAccuracy(accuracy)}
          </Text>
        )}
      </View>

      {status === GPSStatus.ACQUIRING && !error && (
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {Platform.OS === 'ios'
              ? 'Using Apple Core Location - Waiting for first fix'
              : 'Using Google Fused Location - Waiting for first fix'}
          </Text>
          <Text style={styles.hintText}>Move to open sky if this takes {'>'} 10s</Text>
        </View>
      )}

      {shouldShowWarning() && (
        <View style={styles.warningRow}>
          <Ionicons name="warning-outline" size={14} color="#FF9800" />
          <Text style={styles.warningText}>
            Low accuracy may affect tracking quality
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginBottom: 4
  },
  errorState: {
    backgroundColor: '#ffebee'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 8
  },
  accuracyText: {
    fontSize: 12,
    color: '#666',
    fontVariant: ['tabular-nums']
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
    textAlign: 'center'
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginTop: 4
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
    textAlign: 'center',
    flex: 1
  }
  ,
  infoRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  infoText: {
    fontSize: 12,
    color: '#666'
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  }
});


