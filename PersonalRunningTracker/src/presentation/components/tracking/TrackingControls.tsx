import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RunSessionState } from '../../controllers/RunSessionState';

interface TrackingControlsProps {
  sessionState: RunSessionState;
  isLoading: boolean;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
}

export const TrackingControls: React.FC<TrackingControlsProps> = ({
  sessionState,
  isLoading,
  onStart,
  onPause,
  onResume,
  onStop
}) => {
  const handleStartPress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onStart();
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  };

  const handlePausePress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onPause();
    } catch (error) {
      console.error('Failed to pause tracking:', error);
    }
  };

  const handleResumePress = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onResume();
    } catch (error) {
      console.error('Failed to resume tracking:', error);
    }
  };

  const handleStopPress = () => {
    Alert.alert(
      'Stop Run',
      'Are you sure you want to stop this run? This will save your run data.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await onStop();
            } catch (error) {
              console.error('Failed to stop tracking:', error);
            }
          }
        }
      ]
    );
  };

  const renderStartButton = () => (
    <TouchableOpacity
      style={[styles.primaryButton, styles.startButton]}
      onPress={handleStartPress}
      disabled={isLoading}
      accessible={true}
      accessibilityLabel="Start run tracking"
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" size="large" />
      ) : (
        <>
          <Ionicons name="play" size={32} color="#fff" />
          <Text style={styles.primaryButtonText}>Start</Text>
        </>
      )}
    </TouchableOpacity>
  );

  const renderTrackingButtons = () => (
    <View style={styles.trackingButtonsContainer}>
      <TouchableOpacity
        style={[styles.secondaryButton, styles.pauseButton]}
        onPress={handlePausePress}
        disabled={isLoading}
        accessible={true}
        accessibilityLabel="Pause run tracking"
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="pause" size={24} color="#fff" />
            <Text style={styles.secondaryButtonText}>Pause</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, styles.stopButton]}
        onPress={handleStopPress}
        disabled={isLoading}
        accessible={true}
        accessibilityLabel="Stop run tracking"
        accessibilityRole="button"
      >
        <Ionicons name="stop" size={24} color="#fff" />
        <Text style={styles.secondaryButtonText}>Stop</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPausedButtons = () => (
    <View style={styles.trackingButtonsContainer}>
      <TouchableOpacity
        style={[styles.primaryButton, styles.resumeButton]}
        onPress={handleResumePress}
        disabled={isLoading}
        accessible={true}
        accessibilityLabel="Resume run tracking"
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Resume</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, styles.stopButton]}
        onPress={handleStopPress}
        disabled={isLoading}
        accessible={true}
        accessibilityLabel="Stop run tracking"
        accessibilityRole="button"
      >
        <Ionicons name="stop" size={24} color="#fff" />
        <Text style={styles.secondaryButtonText}>Stop</Text>
      </TouchableOpacity>
    </View>
  );

  const renderControls = () => {
    switch (sessionState) {
      case RunSessionState.READY:
        return renderStartButton();
      case RunSessionState.STARTING:
        return (
          <View style={[styles.primaryButton, styles.startButton, styles.loadingState]}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.primaryButtonText}>Starting...</Text>
          </View>
        );
      case RunSessionState.TRACKING:
        return renderTrackingButtons();
      case RunSessionState.PAUSED:
        return renderPausedButtons();
      case RunSessionState.STOPPING:
        return (
          <View style={[styles.primaryButton, styles.stopButton, styles.loadingState]}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.primaryButtonText}>Saving...</Text>
          </View>
        );
      default:
        return renderStartButton();
    }
  };

  return (
    <View style={styles.container}>
      {renderControls()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center'
  },
  primaryButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
  secondaryButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  startButton: {
    backgroundColor: '#4CAF50'
  },
  resumeButton: {
    backgroundColor: '#4CAF50'
  },
  pauseButton: {
    backgroundColor: '#FF9800'
  },
  stopButton: {
    backgroundColor: '#F44336'
  },
  loadingState: {
    opacity: 0.8
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  },
  trackingButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    maxWidth: 250
  }
});
