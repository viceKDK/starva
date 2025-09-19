import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '@/shared/types';
import { StopTrackingResult, SaveRunUseCase } from '@/application/usecases';
import { PersonalRecord } from '@/domain/entities/PersonalRecord';
import { Achievement } from '@/domain/entities/Achievement';
import { SQLiteRunRepository } from '@/infrastructure/persistence';
import { SQLitePersonalRecordRepository } from '@/infrastructure/persistence/SQLitePersonalRecordRepository';
import { SQLiteAchievementRepository } from '@/infrastructure/persistence/SQLiteAchievementRepository';

type RunCompletionScreenRouteProp = RouteProp<RootStackParamList, 'RunCompletion'>;
type RunCompletionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RunCompletion'>;

interface Props {
  route: RunCompletionScreenRouteProp;
  navigation: RunCompletionScreenNavigationProp;
}

type SerializableGPSPoint = Omit<GPSPoint, 'timestamp'> & { timestamp: string };
type SerializableRun = Omit<Run, 'startTime' | 'endTime' | 'createdAt' | 'route'> & {
  startTime: string;
  endTime: string;
  createdAt: string;
  route: SerializableGPSPoint[];
};
type SerializableStopTrackingResult = {
  run: SerializableRun;
  trackingPoints: SerializableGPSPoint[];
};

export const RunCompletionScreen: React.FC<Props> = ({ route, navigation }) => {
  // Accept both serialized and deserialized payloads for compatibility
  const incoming = route.params.runData as SerializableStopTrackingResult | StopTrackingResult;
  const runData: StopTrackingResult = 'startTime' in (incoming as any).run
    ? {
        run: {
          ...(incoming as SerializableStopTrackingResult).run,
          startTime: new Date((incoming as SerializableStopTrackingResult).run.startTime),
          endTime: new Date((incoming as SerializableStopTrackingResult).run.endTime),
          createdAt: new Date((incoming as SerializableStopTrackingResult).run.createdAt),
          route: (incoming as SerializableStopTrackingResult).run.route.map(p => ({
            ...p,
            timestamp: new Date(p.timestamp),
          })),
        },
        trackingPoints: (incoming as SerializableStopTrackingResult).trackingPoints.map(p => ({
          ...p,
          timestamp: new Date(p.timestamp),
        })),
      }
    : (incoming as StopTrackingResult);
  const [runName, setRunName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [saveRunUseCase] = useState(() => new SaveRunUseCase(
    new SQLiteRunRepository(),
    new SQLitePersonalRecordRepository(),
    new SQLiteAchievementRepository()
  ));

  useEffect(() => {
    // Generate default run name based on time of day
    const now = new Date();
    const hour = now.getHours();
    let defaultName = '';

    if (hour >= 5 && hour < 12) {
      defaultName = 'Morning Run';
    } else if (hour >= 12 && hour < 17) {
      defaultName = 'Afternoon Run';
    } else if (hour >= 17 && hour < 21) {
      defaultName = 'Evening Run';
    } else {
      defaultName = 'Night Run';
    }

    setRunName(defaultName);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (secondsPerKm: number): string => {
    // If distance is too short, pace is not meaningful
    if (secondsPerKm === 0 || !isFinite(secondsPerKm) || run.distance < 200) return '--:--';

    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const validateRunData = (): boolean => {
    const { run } = runData;

    // Minimum distance validation (100 meters)
    if (run.distance < 100) {
      Alert.alert(
        'Run Too Short',
        'Your run must be at least 100 meters to be saved. Would you like to discard it?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: handleDiscard }
        ]
      );
      return false;
    }

    // Minimum duration validation (60 seconds)
    if (run.duration < 60) {
      Alert.alert(
        'Run Too Short',
        'Your run must be at least 1 minute to be saved. Would you like to discard it?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: handleDiscard }
        ]
      );
      return false;
    }

    // Run name validation
    if (!runName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a name for your run.');
      return false;
    }

    if (runName.length > 50) {
      Alert.alert('Name Too Long', 'Run name must be 50 characters or less.');
      return false;
    }

    if (notes.length > 500) {
      Alert.alert('Notes Too Long', 'Notes must be 500 characters or less.');
      return false;
    }

    return true;
  };

  const handleSaveRun = async () => {
    if (!validateRunData()) return;

    setIsSaving(true);
    try {
      // Save run using SaveRunUseCase
      const result = await saveRunUseCase.execute(runData.run, runName, notes);

      if (result.success) {
        const { personalRecords: newRecords, achievements: newAchievements } = result.data;
        setPersonalRecords(newRecords);
        setAchievements(newAchievements);

        // Show appropriate success message based on whether PRs or achievements were earned
        const hasRecords = newRecords.length > 0;
        const hasAchievements = newAchievements.length > 0;

        if (hasRecords || hasAchievements) {
          let title = '';
          let message = `"${runName}" has been saved to your run history.\n\n`;

          if (hasRecords && hasAchievements) {
            title = '🏆 Records & Achievements Unlocked!';
            const recordTitles = newRecords.map(record => record.getDisplayTitle()).join(', ');
            const achievementTitles = newAchievements.map(achievement => achievement.title).join(', ');
            message += `Personal Records: ${recordTitles}\n\nAchievements: ${achievementTitles}`;
          } else if (hasRecords) {
            title = '🏆 Personal Records Achieved!';
            const recordTitles = newRecords.map(record => record.getDisplayTitle()).join(', ');
            message += `New Records: ${recordTitles}`;
          } else if (hasAchievements) {
            title = '🎉 Achievements Unlocked!';
            const achievementTitles = newAchievements.map(achievement => achievement.title).join(', ');
            message += `New Achievements: ${achievementTitles}`;
          }

          Alert.alert(
            title,
            message,
            [
              {
                text: 'View Records',
                onPress: () => navigation.navigate('MainTabs', { screen: 'PersonalRecords' })
              },
              {
                text: 'View History',
                onPress: () => navigation.navigate('MainTabs', { screen: 'History' })
              },
              {
                text: 'Start New Run',
                onPress: () => navigation.navigate('MainTabs', { screen: 'Tracking' })
              }
            ]
          );
        } else {
          Alert.alert(
            'Run Saved!',
            `"${runName}" has been saved to your run history.`,
            [
              {
                text: 'View History',
                onPress: () => navigation.navigate('MainTabs', { screen: 'History' })
              },
              {
                text: 'Start New Run',
                onPress: () => navigation.navigate('MainTabs', { screen: 'Tracking' })
              }
            ]
          );
        }
      } else {
        Alert.alert(
          'Save Failed',
          'Failed to save your run. Please check your data and try again.',
          [
            { text: 'Retry', onPress: handleSaveRun },
            { text: 'Cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to save run:', error);
      Alert.alert(
        'Save Failed',
        'An unexpected error occurred. Please try again.',
        [
          { text: 'Retry', onPress: handleSaveRun },
          { text: 'Cancel' }
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Run',
      'Are you sure you want to discard this run? This action cannot be undone.',
      [
        { text: 'Keep Run', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Tracking' })
        }
      ]
    );
  };

  const handleContinueTracking = () => {
    Alert.alert(
      'Continue Tracking',
      'Resume your current run session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Tracking' })
        }
      ]
    );
  };

  const { run } = runData;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Run Complete!</Text>
          <Text style={styles.subtitle}>Great job! Here's your run summary</Text>
        </View>

        {/* Metrics Summary */}
        <View style={styles.metricsContainer}>
          <View style={styles.primaryMetric}>
            <Text style={styles.primaryValue}>{(run.distance / 1000).toFixed(2)}</Text>
            <Text style={styles.primaryLabel}>kilometers</Text>
          </View>

          <View style={styles.secondaryMetrics}>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.metricValue}>{formatDuration(run.duration)}</Text>
              <Text style={styles.metricLabel}>Duration</Text>
            </View>

            <View style={styles.metricItem}>
              <Ionicons name="speedometer-outline" size={20} color="#666" />
              <Text style={styles.metricValue}>{formatPace(run.averagePace)}</Text>
              <Text style={styles.metricLabel}>Avg Pace</Text>
            </View>
          </View>
        </View>

        {/* Time Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Started:</Text>
            <Text style={styles.detailValue}>
              {run.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Finished:</Text>
            <Text style={styles.detailValue}>
              {run.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>GPS Points:</Text>
            <Text style={styles.detailValue}>{run.route?.length || 0}</Text>
          </View>
        </View>

        {/* Route Map Preview Placeholder */}
        <TouchableOpacity
          style={styles.mapPreview}
          onPress={() => setShowRouteMap(!showRouteMap)}
        >
          <Ionicons name="map-outline" size={40} color="#FF6B35" />
          <Text style={styles.mapText}>Route Map</Text>
          <Text style={styles.mapSubtext}>Tap to {showRouteMap ? 'hide' : 'view'} route</Text>
        </TouchableOpacity>
        {showRouteMap && run.route && run.route.length > 1 && (
          <View style={{ height: 240, marginHorizontal: 20, marginBottom: 16, borderRadius: 12, overflow: 'hidden' }}>
            {/* Mapbox static preview for route */}
            {(() => {
              const Static = require('@/presentation/components/maps/StaticMapboxImage');
              const StaticMapboxImage = Static.StaticMapboxImage || Static.default;
              return (
                <StaticMapboxImage
                  points={run.route}
                  width={Math.round(
                    require('react-native').Dimensions.get('window').width - 40
                  )}
                  height={240}
                />
              );
            })()}
          </View>
        )}

        {/* Run Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Run Name</Text>
          <TextInput
            style={styles.textInput}
            value={runName}
            onChangeText={setRunName}
            placeholder="Enter run name"
            maxLength={50}
            editable={!isSaving}
          />
          <Text style={styles.characterCount}>{runName.length}/50</Text>
        </View>

        {/* Notes Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did your run feel? Any notes about the route or weather?"
            multiline
            maxLength={500}
            editable={!isSaving}
          />
          <Text style={styles.characterCount}>{notes.length}/500</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSaveRun}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Save Run</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryButtonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleContinueTracking}
            disabled={isSaving}
          >
            <Ionicons name="play" size={16} color="#FF6B35" />
            <Text style={styles.secondaryButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDiscard}
            disabled={isSaving}
          >
            <Ionicons name="trash-outline" size={16} color="#F44336" />
            <Text style={styles.dangerButtonText}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollView: {
    flex: 1
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  metricsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24
  },
  primaryMetric: {
    alignItems: 'center',
    marginBottom: 24
  },
  primaryValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B35'
  },
  primaryLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4
  },
  secondaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  metricItem: {
    alignItems: 'center',
    flex: 1
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase'
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  mapPreview: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8
  },
  mapSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  inputContainer: {
    paddingHorizontal: 20,
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff'
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top'
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: '#FF6B35'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  secondaryButtonContainer: {
    flexDirection: 'row',
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#FF6B35'
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  },
  dangerButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F44336'
  },
  dangerButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  }
});
