import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { RootTabScreenProps } from '@/shared/types';
import { useRunTrackingController } from '../controllers/RunTrackingController';
import { RunSessionState } from '../controllers/RunSessionState';
import { useAppState } from '../hooks/useAppState';
import {
  TrackingControls,
  MetricsDisplay,
  GPSStatusIndicator
} from '../components/tracking';
import { LiveTrackingMap } from '../components/maps/LiveTrackingMap';
import {
  StartRunTrackingUseCase,
  PauseRunTrackingUseCase,
  ResumeRunTrackingUseCase,
  StopRunTrackingUseCase
} from '@/application/usecases';
import { ExpoGPSService } from '@/infrastructure/gps';
import { SQLiteRunRepository } from '@/infrastructure/persistence';

type Props = RootTabScreenProps<'Tracking'>;

type Deps = {
  gpsService: ExpoGPSService;
  runRepository: SQLiteRunRepository;
  useCases: {
    startUseCase: StartRunTrackingUseCase;
    pauseUseCase: PauseRunTrackingUseCase;
    resumeUseCase: ResumeRunTrackingUseCase;
    stopUseCase: StopRunTrackingUseCase;
  };
};

export const TrackingScreen: React.FC<Props> = ({ navigation }) => {
  const [dependencies, setDependencies] = useState<Deps | null>(null);

  // Initialize dependencies
  useEffect(() => {
    const initializeDependencies = async () => {
      try {
        const gpsService = new ExpoGPSService();
        const runRepository = new SQLiteRunRepository();

        // Initialize repository
        await runRepository.initialize();

        const useCases = {
          startUseCase: new StartRunTrackingUseCase(gpsService),
          pauseUseCase: new PauseRunTrackingUseCase(gpsService),
          resumeUseCase: new ResumeRunTrackingUseCase(gpsService),
          stopUseCase: new StopRunTrackingUseCase(gpsService, runRepository)
        };

        setDependencies({
          gpsService,
          runRepository,
          useCases
        });
      } catch (error) {
        console.error('Failed to initialize dependencies:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize tracking services. Please restart the app.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeDependencies();
  }, []);

  // Show loading state while dependencies are initializing
  if (!dependencies) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing tracking services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TrackingContent navigation={navigation} deps={dependencies} />
  );
};

const TrackingContent: React.FC<{ navigation: Props['navigation']; deps: Deps }> = ({ navigation, deps }) => {
  const controller = useRunTrackingController(deps.gpsService, deps.useCases);

  // Keep screen awake during tracking
  useKeepAwake('TrackingScreen', { suppressDeactivateWarnings: true });

  // Handle app background/foreground state changes
  useAppState({
    onBackground: () => {
      if (controller && controller.sessionState === RunSessionState.TRACKING) {
        console.log('App backgrounded during tracking - session will persist');
        // Session auto-save is handled by the controller's auto-save interval
      }
    },
    onForeground: () => {
      if (controller && controller.sessionState === RunSessionState.TRACKING) {
        console.log('App foregrounded - resuming tracking display');
        // GPS service continues in background, no need to restart
      }
    }
  });

  // Handle navigation restrictions during tracking
  useEffect(() => {
    // Update header based on session state
    let headerTitle = 'Track Run';
    switch (controller.sessionState) {
      case RunSessionState.TRACKING:
        headerTitle = 'Tracking';
        break;
      case RunSessionState.PAUSED:
        headerTitle = 'Paused';
        break;
      case RunSessionState.STARTING:
        headerTitle = 'Starting...';
        break;
      case RunSessionState.STOPPING:
        headerTitle = 'Saving...';
        break;
    }

    navigation.setOptions({
      title: headerTitle
    });
  }, [controller.sessionState, navigation]);

  // Handle stop tracking result with confirmation
  const handleStopTracking = async () => {
    // Show confirmation dialog before stopping
    Alert.alert(
      'Complete Run',
      'Are you sure you want to stop and complete this run?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Complete Run',
          style: 'default',
          onPress: async () => {
            // If run is too short, suggest continuing instead of stopping
            const minDistance = 100; // meters
            const minDuration = 60; // seconds
            if (controller.metrics.distance < minDistance || controller.metrics.duration < minDuration) {
              Alert.alert(
                'Run Too Short',
                'Your run should be at least 100 meters and 1 minute to save meaningful metrics. Keep tracking or discard?',
                [
                  { text: 'Keep Tracking', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: async () => {
                      await controller.stopTracking();
                      Alert.alert('Run Discarded', 'Short run discarded successfully.');
                    }
                  }
                ]
              );
              return;
            }

            const result = await controller.stopTracking();
            if (result) {
              // Serialize dates before navigation to avoid non-serializable warnings
              const serialized = {
                run: {
                  ...result.run,
                  startTime: result.run.startTime.toISOString(),
                  endTime: result.run.endTime.toISOString(),
                  createdAt: result.run.createdAt.toISOString(),
                  route: result.run.route.map(p => ({
                    ...p,
                    timestamp: p.timestamp.toISOString(),
                  })),
                },
                trackingPoints: result.trackingPoints.map(p => ({
                  ...p,
                  timestamp: p.timestamp.toISOString(),
                })),
              } as const;

              navigation.navigate('RunCompletion', { runData: serialized as any });
            } else {
              Alert.alert(
                'Error',
                'Failed to complete your run. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        bounces={true}
      >
        {/* GPS Status */}
        <View style={styles.statusBarContainer}>
          <GPSStatusIndicator
            status={controller.gpsStatus}
            accuracy={controller.gpsAccuracy}
            error={controller.error}
          />
        </View>

        {/* Metrics Display */}
        <MetricsDisplay
          metrics={controller.metrics}
          isTracking={controller.sessionState === RunSessionState.TRACKING}
        />

        {/* Live Tracking Map */}
        {controller.trackingPoints.length > 0 ? (
          <View style={styles.mapContainer}>
            <LiveTrackingMap
              points={controller.trackingPoints}
              currentLocation={controller.currentLocation}
              height={280}
              showCurrentLocation={true}
              isTracking={controller.sessionState === RunSessionState.TRACKING}
            />
          </View>
        ) : (
          <View style={styles.emptyMapContainer}>
            <Text style={styles.emptyMapText}>Start tracking to see your route</Text>
          </View>
        )}

        {/* Error Display */}
        {controller.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{controller.error}</Text>
          </View>
        )}

        {/* Session Status Message */}
        {controller.sessionState === RunSessionState.PAUSED && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>⏸️ Run Paused</Text>
            <Text style={styles.statusSubtext}>Tap Resume to continue tracking</Text>
          </View>
        )}

        {/* Extra padding for bottom controls */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TrackingControls
          sessionState={controller.sessionState}
          isLoading={controller.isLoading}
          onStart={controller.startTracking}
          onPause={controller.pauseTracking}
          onResume={controller.resumeTracking}
          onStop={handleStopTracking}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fafafa'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20
  },
  statusBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  mapContainer: {
    marginTop: 8,
    marginBottom: 16
  },
  emptyMapContainer: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed'
  },
  emptyMapText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500'
  },
  controlsContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  errorContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 18,
    backgroundColor: '#ffebee',
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#F44336',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600'
  },
  statusContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 20,
    backgroundColor: '#fff3e0',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB74D',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F57C00',
    marginBottom: 6
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500'
  }
});
