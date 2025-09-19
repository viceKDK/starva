import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
// Centralized map implementation (Apple today; switch here via maps/index)
import { CurrentRouteMap } from '@/presentation/components/maps';
import RouteLivePreview from '@/presentation/components/maps/RouteLivePreview';

import { RootStackParamList } from '@/shared/types';
import { Run, GPSPoint } from '@/domain/entities';
import {
  GetRunByIdUseCase,
  UpdateRunUseCase,
  DeleteRunUseCase
} from '@/application/usecases';
import { SQLiteRunRepository } from '@/infrastructure/persistence';

type RunDetailsScreenRouteProp = RouteProp<RootStackParamList, 'RunDetail'>;
type RunDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RunDetail'>;

interface Props {
  route: RunDetailsScreenRouteProp;
  navigation: RunDetailsScreenNavigationProp;
}

interface PaceSplit {
  km: number;
  pace: number; // seconds per km
  time: number; // seconds from start
}

interface RunDetailsHeaderProps {
  run: Run;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const RunDetailsHeader: React.FC<RunDetailsHeaderProps> = ({ run, onEdit, onShare, onDelete }) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={styles.runName}>{run.name}</Text>
          <Text style={styles.runDate}>
            {formatDate(run.startTime)} at {formatTime(run.startTime)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="pencil" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      {run.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{run.notes}</Text>
        </View>
      )}
    </View>
  );
};

interface MetricsGridProps {
  run: Run;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ run }) => {
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
    if (secondsPerKm === 0 || !isFinite(secondsPerKm)) return '--:--';

    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const estimateCalories = (distanceKm: number, durationMinutes: number): number => {
    // Simple estimation: ~60 calories per km for average runner
    return Math.round(distanceKm * 60);
  };

  const metrics = [
    {
      label: 'Distance',
      value: `${(run.distance / 1000).toFixed(2)} km`,
      icon: 'trail-sign-outline'
    },
    {
      label: 'Duration',
      value: formatDuration(run.duration),
      icon: 'time-outline'
    },
    {
      label: 'Avg Pace',
      value: `${formatPace(run.averagePace)}/km`,
      icon: 'speedometer-outline'
    },
    {
      label: 'Calories',
      value: `${estimateCalories(run.distance / 1000, run.duration / 60)}`,
      icon: 'flame-outline'
    }
  ];

  return (
    <View style={styles.metricsContainer}>
      <Text style={styles.sectionTitle}>Run Summary</Text>
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <Ionicons name={metric.icon as any} size={24} color="#FF6B35" />
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface RouteMapProps {
  gpsPoints: GPSPoint[];
}

const RouteMap: React.FC<RouteMapProps> = ({ gpsPoints }) => {
  const [showLive, setShowLive] = React.useState(false);
  return (
    <View style={styles.mapContainer}>
      <Text style={styles.sectionTitle}>Route Map</Text>
      <CurrentRouteMap points={gpsPoints} enableAnimation={true} />

      <View style={styles.mapActions}>
        <TouchableOpacity style={styles.liveButton} onPress={() => setShowLive(true)}>
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.liveButtonText}>Ver recorrido en vivo</Text>
        </TouchableOpacity>
      </View>

      {showLive && (
        <View style={styles.livePreviewWrapper}>
          <RouteLivePreview points={gpsPoints} onClose={() => setShowLive(false)} />
        </View>
      )}

      <View style={styles.mapStats}>
        <View style={styles.mapStat}>
          <Text style={styles.mapStatLabel}>GPS Points</Text>
          <Text style={styles.mapStatValue}>{gpsPoints.length}</Text>
        </View>
        <View style={styles.mapStat}>
          <Text style={styles.mapStatLabel}>Avg Accuracy</Text>
          <Text style={styles.mapStatValue}>
            {gpsPoints.length > 0
              ? `${Math.round(gpsPoints.reduce((sum, p) => sum + (p.accuracy || 0), 0) / gpsPoints.length)}m`
              : 'N/A'
            }
          </Text>
        </View>
      </View>
    </View>
  );
};

interface PaceAnalysisProps {
  run: Run;
}

const PaceAnalysis: React.FC<PaceAnalysisProps> = ({ run }) => {
  // Hoisted as a function declaration so it’s available in useMemo below
  function calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLonRad / 2) *
        Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const splits = useMemo(() => {
    if (!run.route || run.route.length < 2) return [];

    const splits: PaceSplit[] = [];
    const points = run.route;
    let totalDistance = 0;
    let currentKm = 1;
    let kmStartIndex = 0;

    for (let i = 1; i < points.length; i++) {
      const distance = calculateDistance(points[i - 1], points[i]);
      totalDistance += distance;

      if (totalDistance >= currentKm * 1000 || i === points.length - 1) {
        const startTime = points[kmStartIndex].timestamp.getTime();
        const endTime = points[i].timestamp.getTime();
        const splitTime = (endTime - startTime) / 1000;
        const splitDistance = Math.min(totalDistance - (currentKm - 1) * 1000, 1000);
        const pace = splitTime / (splitDistance / 1000);

        splits.push({
          km: currentKm,
          pace,
          time: splitTime
        });

        currentKm++;
        kmStartIndex = i;
      }
    }

    return splits;
  }, [run.route]);

  const formatPace = (pace: number): string => {
    if (!isFinite(pace)) return '--:--';
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const fastestSplit = splits.length > 0 ? splits.reduce((fastest, split) =>
    split.pace < fastest.pace ? split : fastest
  ) : null;

  const slowestSplit = splits.length > 0 ? splits.reduce((slowest, split) =>
    split.pace > slowest.pace ? split : slowest
  ) : null;

  if (splits.length === 0) {
    return (
      <View style={styles.paceContainer}>
        <Text style={styles.sectionTitle}>Pace Analysis</Text>
        <View style={styles.noPaceData}>
          <Ionicons name="speedometer-outline" size={48} color="#ccc" />
          <Text style={styles.noPaceText}>Insufficient GPS data for pace analysis</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.paceContainer}>
      <Text style={styles.sectionTitle}>Pace Analysis</Text>

      {fastestSplit && slowestSplit && (
        <View style={styles.paceHighlights}>
          <View style={styles.paceHighlight}>
            <Text style={styles.paceHighlightLabel}>Fastest KM</Text>
            <Text style={styles.paceHighlightValue}>KM {fastestSplit.km}</Text>
            <Text style={styles.paceHighlightPace}>{formatPace(fastestSplit.pace)}/km</Text>
          </View>
          <View style={styles.paceHighlight}>
            <Text style={styles.paceHighlightLabel}>Slowest KM</Text>
            <Text style={styles.paceHighlightValue}>KM {slowestSplit.km}</Text>
            <Text style={styles.paceHighlightPace}>{formatPace(slowestSplit.pace)}/km</Text>
          </View>
        </View>
      )}

      <View style={styles.splitsTable}>
        <View style={styles.splitsHeader}>
          <Text style={styles.splitsHeaderText}>KM</Text>
          <Text style={styles.splitsHeaderText}>Time</Text>
          <Text style={styles.splitsHeaderText}>Pace</Text>
        </View>
        {splits.map((split) => (
          <View key={split.km} style={[
            styles.splitRow,
            split === fastestSplit && styles.fastestSplit,
            split === slowestSplit && styles.slowestSplit
          ]}>
            <Text style={styles.splitText}>{split.km}</Text>
            <Text style={styles.splitText}>
              {Math.floor(split.time / 60)}:{(split.time % 60).toFixed(0).padStart(2, '0')}
            </Text>
            <Text style={styles.splitText}>{formatPace(split.pace)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const RunDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { runId } = route.params;
  const [run, setRun] = useState<Run | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize use cases
  const getRunByIdUseCase = useMemo(() => new GetRunByIdUseCase(new SQLiteRunRepository()), []);
  const updateRunUseCase = useMemo(() => new UpdateRunUseCase(new SQLiteRunRepository()), []);
  const deleteRunUseCase = useMemo(() => new DeleteRunUseCase(new SQLiteRunRepository()), []);

  useEffect(() => {
    loadRun();
  }, [runId]);

  const loadRun = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getRunByIdUseCase.execute(runId);

      if (result.success) {
        setRun(result.data);
        // Set navigation title to run name
        navigation.setOptions({
          title: result.data.name
        });
      } else {
        setError('Run not found');
        Alert.alert('Error', 'Run not found', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Failed to load run:', error);
      setError('Failed to load run');
      Alert.alert('Error', 'Failed to load run details', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!run) return;

    Alert.prompt(
      'Edit Run',
      'Enter new run name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (newName && newName.trim()) {
              try {
                const result = await updateRunUseCase.execute(runId, { name: newName.trim() });
                if (result.success) {
                  setRun(result.data);
                  navigation.setOptions({ title: result.data.name });
                  Alert.alert('Success', 'Run name updated successfully');
                } else {
                  Alert.alert('Error', 'Failed to update run name');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to update run name');
              }
            }
          }
        }
      ],
      'plain-text',
      run.name
    );
  };

  const handleShare = async () => {
    if (!run) return;

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
      if (secondsPerKm === 0 || !isFinite(secondsPerKm)) return '--:--';

      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.floor(secondsPerKm % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const shareText = `🏃‍♂️ ${run.name}

📅 ${run.startTime.toLocaleDateString()}
📏 Distance: ${(run.distance / 1000).toFixed(2)} km
⏱️ Duration: ${formatDuration(run.duration)}
⚡ Pace: ${formatPace(run.averagePace)}/km

${run.notes ? '📝 ' + run.notes : ''}

#running #fitness`;

    try {
      await Share.share({
        message: shareText,
        title: run.name
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleDelete = () => {
    if (!run) return;

    Alert.alert(
      'Delete Run',
      `Are you sure you want to delete "${run.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteRunUseCase.execute(runId);
              if (result.success) {
                Alert.alert(
                  'Deleted',
                  'Run deleted successfully',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else {
                Alert.alert('Error', 'Failed to delete run');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete run');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading run details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !run) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>{error || 'Run not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRun}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <RunDetailsHeader
          run={run}
          onEdit={handleEdit}
          onShare={handleShare}
          onDelete={handleDelete}
        />

        <MetricsGrid run={run} />

        <RouteMap gpsPoints={run.route || []} />

        <PaceAnalysis run={run} />
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerLeft: {
    flex: 1,
    marginRight: 16
  },
  runName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  runDate: {
    fontSize: 16,
    color: '#666'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa'
  },
  notesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  metricsContainer: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase'
  },
  mapContainer: {
    padding: 20,
    paddingTop: 0
  },
  mapWrapper: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12
  },
  map: {
    flex: 1
  },
  noMapData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12
  },
  noMapText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8
  },
  mapActions: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'flex-start'
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  liveButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600'
  },
  livePreviewWrapper: {
    marginTop: 8,
    marginBottom: 8
  },
  mapStat: {
    alignItems: 'center'
  },
  mapStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  mapStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  mapActions: {
    marginTop: 4,
    alignItems: 'flex-start'
  },
  animateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6
  },
  animateButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600'
  },
  paceContainer: {
    padding: 20,
    paddingTop: 0
  },
  noPaceData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12
  },
  noPaceText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center'
  },
  paceHighlights: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  paceHighlight: {
    flex: 1,
    backgroundColor: '#fff5f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  paceHighlightLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  paceHighlightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4
  },
  paceHighlightPace: {
    fontSize: 14,
    color: '#333'
  },
  splitsTable: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  splitsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  splitsHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  splitRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  fastestSplit: {
    backgroundColor: '#e8f5e8'
  },
  slowestSplit: {
    backgroundColor: '#ffebee'
  },
  splitText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center'
  }
});
