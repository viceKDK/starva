import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SessionData } from '@/infrastructure/storage/SessionStorageService';

interface SessionRecoveryDialogProps {
  visible: boolean;
  sessionData: SessionData | null;
  onContinue: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const SessionRecoveryDialog: React.FC<SessionRecoveryDialogProps> = ({
  visible,
  sessionData,
  onContinue,
  onSave,
  onDiscard
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!sessionData) return null;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateDistance = (): number => {
    if (!sessionData.trackingPoints.length) return 0;

    let totalDistance = 0;
    for (let i = 1; i < sessionData.trackingPoints.length; i++) {
      const prev = sessionData.trackingPoints[i - 1]!;
      const curr = sessionData.trackingPoints[i]!;

      // Haversine formula for distance calculation
      const R = 6371000; // Earth's radius in meters
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    return totalDistance;
  };

  const calculateCurrentDuration = (): number => {
    if (!sessionData.startTime) return 0;

    const startTime = new Date(sessionData.startTime);
    const now = new Date();
    const totalElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    return Math.max(0, totalElapsed - sessionData.pausedTime);
  };

  const distance = calculateDistance();
  const duration = calculateCurrentDuration();

  const handleAction = async (action: () => void) => {
    setIsProcessing(true);
    try {
      await action();
    } catch (error) {
      console.error('Session recovery action failed:', error);
      Alert.alert('Error', 'Failed to process session recovery. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Session Recovery</Text>
          <Text style={styles.subtitle}>
            We found an incomplete run from your last session.
          </Text>

          <View style={styles.sessionInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Started:</Text>
              <Text style={styles.infoValue}>
                {sessionData.startTime ? new Date(sessionData.startTime).toLocaleTimeString() : 'Unknown'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>{formatDuration(duration)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{(distance / 1000).toFixed(2)} km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>GPS Points:</Text>
              <Text style={styles.infoValue}>{sessionData.trackingPoints.length}</Text>
            </View>
          </View>

          <Text style={styles.question}>What would you like to do?</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => handleAction(onContinue)}
              disabled={isProcessing}
            >
              <Text style={styles.primaryButtonText}>Continue Tracking</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handleAction(onSave)}
              disabled={isProcessing}
            >
              <Text style={styles.secondaryButtonText}>Save Run</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={() => handleAction(onDiscard)}
              disabled={isProcessing}
            >
              <Text style={styles.dangerButtonText}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24
  },
  sessionInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  question: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500'
  },
  buttonContainer: {
    gap: 12
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryButton: {
    backgroundColor: '#4CAF50'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#FF9800'
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  dangerButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#F44336'
  },
  dangerButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600'
  }
});
