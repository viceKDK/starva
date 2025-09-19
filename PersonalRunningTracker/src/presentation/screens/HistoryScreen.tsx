import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { RootTabScreenProps } from '@/shared/types';
import { Run } from '@/domain/entities';
import { StaticMapboxImage } from '@/presentation/components/maps/StaticMapboxImage';
import {
  GetAllRunsUseCase,
  GetRunStatisticsUseCase,
  SortOption,
  RunStatistics
} from '@/application/usecases';
import { SQLiteRunRepository } from '@/infrastructure/persistence';

type Props = RootTabScreenProps<'History'>;

interface RunListItemProps {
  run: Run;
  onPress: (run: Run) => void;
}

const RunListItem: React.FC<RunListItemProps> = ({ run, onPress }) => {
  const thumbWidth = Math.round(Dimensions.get('window').width - 40);
  const thumbHeight = 120;
  const formatDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const runDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (runDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (runDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

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

  const hasRoute = run.route && run.route.length > 1;

  return (
    <TouchableOpacity style={styles.runItem} onPress={() => onPress(run)}>
      <View style={styles.runItemHeader}>
        <View style={styles.runItemLeft}>
          <Text style={styles.runDate}>{formatDate(run.startTime)}</Text>
          <Text style={styles.runName}>{run.name}</Text>
        </View>
        <View style={styles.runItemRight}>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
      </View>

      {!!hasRoute && (
        <View style={styles.thumbWrapper}>
          <StaticMapboxImage points={run.route} width={thumbWidth} height={thumbHeight} />
        </View>
      )}

      <View style={styles.runMetrics}>
        <View style={styles.metric}>
          <Ionicons name="trail-sign-outline" size={16} color="#666" />
          <Text style={styles.metricValue}>{(run.distance / 1000).toFixed(2)} km</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.metricValue}>{formatDuration(run.duration)}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="speedometer-outline" size={16} color="#666" />
          <Text style={styles.metricValue}>{formatPace(run.averagePace)}/km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface StatisticsHeaderProps {
  statistics: RunStatistics;
  isLoading: boolean;
}

const StatisticsHeader: React.FC<StatisticsHeaderProps> = ({ statistics, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.statisticsContainer}>
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  }

  const formatDistance = (meters: number): string => {
    return (meters / 1000).toFixed(1);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.statisticsContainer}>
      <Text style={styles.statisticsTitle}>Your Stats</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{statistics.totalRuns}</Text>
          <Text style={styles.statLabel}>Total Runs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDistance(statistics.totalDistance)}</Text>
          <Text style={styles.statLabel}>Total Distance (km)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatTime(statistics.totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>

      <View style={styles.periodStats}>
        <View style={styles.periodStatItem}>
          <Text style={styles.periodStatLabel}>This Week</Text>
          <Text style={styles.periodStatValue}>
            {statistics.thisWeekStats.runs} runs • {formatDistance(statistics.thisWeekStats.distance)} km
          </Text>
        </View>
        <View style={styles.periodStatItem}>
          <Text style={styles.periodStatLabel}>This Month</Text>
          <Text style={styles.periodStatValue}>
            {statistics.thisMonthStats.runs} runs • {formatDistance(statistics.thisMonthStats.distance)} km
          </Text>
        </View>
      </View>
    </View>
  );
};

interface SortControlsProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SortControls: React.FC<SortControlsProps> = ({
  sortOption,
  onSortChange,
  searchQuery,
  onSearchChange
}) => {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'date-desc', label: 'Newest First' },
    { value: 'date-asc', label: 'Oldest First' },
    { value: 'distance-desc', label: 'Longest Distance' },
    { value: 'distance-asc', label: 'Shortest Distance' },
    { value: 'pace-asc', label: 'Fastest Pace' },
    { value: 'pace-desc', label: 'Slowest Pace' }
  ];

  const [showSortOptions, setShowSortOptions] = useState(false);

  const currentSortLabel = sortOptions.find(option => option.value === sortOption)?.label || 'Newest First';

  return (
    <View style={styles.controlsContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search runs..."
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
      </View>

      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortOptions(!showSortOptions)}
      >
        <Ionicons name="filter" size={16} color="#FF6B35" />
        <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
        <Ionicons name="chevron-down" size={16} color="#FF6B35" />
      </TouchableOpacity>

      {showSortOptions && (
        <View style={styles.sortOptionsContainer}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortOption === option.value && styles.sortOptionActive
              ]}
              onPress={() => {
                onSortChange(option.value);
                setShowSortOptions(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortOption === option.value && styles.sortOptionTextActive
              ]}>
                {option.label}
              </Text>
              {sortOption === option.value && (
                <Ionicons name="checkmark" size={16} color="#FF6B35" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [statistics, setStatistics] = useState<RunStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize use cases
  const getAllRunsUseCase = useMemo(() => new GetAllRunsUseCase(new SQLiteRunRepository()), []);
  const getStatisticsUseCase = useMemo(() => new GetRunStatisticsUseCase(new SQLiteRunRepository()), []);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Load runs and statistics in parallel
      const [runsResult, statsResult] = await Promise.all([
        getAllRunsUseCase.execute({
          sortBy: sortOption,
          searchQuery: searchQuery.trim() || undefined,
          limit: 50 // Initial load limit
        }),
        getStatisticsUseCase.execute()
      ]);

      if (runsResult.success) {
        setRuns(runsResult.data || []);
      } else {
        console.error('Failed to load runs:', runsResult.error);
        Alert.alert('Error', 'Failed to load run history. Please try again.');
      }

      if (statsResult.success) {
        setStatistics(statsResult.data || null);
      } else {
        console.error('Failed to load statistics:', statsResult.error);
      }
    } catch (error) {
      console.error('Error loading history data:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getAllRunsUseCase, getStatisticsUseCase, sortOption, searchQuery]);

  // Load data on mount and when sort/search changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh list when screen regains focus (e.g., after deleting a run in details)
  useFocusEffect(
    useCallback(() => {
      // Refresh silently without showing loader
      loadData();
      return () => {};
    }, [loadData])
  );

  const handleRunPress = useCallback((run: Run) => {
    navigation.navigate('RunDetail', { runId: run.id });
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const renderRunItem = useCallback(({ item }: { item: Run }) => (
    <RunListItem run={item} onPress={handleRunPress} />
  ), [handleRunPress]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="footsteps-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Runs Yet</Text>
      <Text style={styles.emptyStateText}>
        Start your first run to see your history here!
      </Text>
      <TouchableOpacity
        style={styles.startRunButton}
        onPress={() => navigation.navigate('Tracking')}
      >
        <Text style={styles.startRunButtonText}>Start Running</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View>
      {statistics && (
        <StatisticsHeader statistics={statistics} isLoading={false} />
      )}
      <SortControls
        sortOption={sortOption}
        onSortChange={setSortOption}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading your runs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={runs}
        renderItem={renderRunItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        contentContainerStyle={runs.length === 0 ? styles.emptyListContainer : undefined}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 120, // Approximate item height
          offset: 120 * index,
          index,
        })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
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
  emptyListContainer: {
    flexGrow: 1
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32
  },
  startRunButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  startRunButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  statisticsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    marginBottom: 16
  },
  statisticsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4
  },
  periodStats: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16
  },
  periodStatItem: {
    marginBottom: 8
  },
  periodStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  periodStatValue: {
    fontSize: 14,
    color: '#666'
  },
  controlsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 6,
    backgroundColor: '#ffffff'
  },
  sortButtonText: {
    fontSize: 14,
    color: '#FF6B35',
    marginHorizontal: 8,
    flex: 1
  },
  sortOptionsContainer: {
    position: 'absolute',
    top: 76,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  sortOptionActive: {
    backgroundColor: '#fff5f0'
  },
  sortOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  sortOptionTextActive: {
    color: '#FF6B35',
    fontWeight: '600'
  },
  runItem: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  runItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  runItemLeft: {
    flex: 1
  },
  runItemRight: {
    marginLeft: 12
  },
  runDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  runName: {
    fontSize: 14,
    color: '#666'
  },
  runMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  thumbWrapper: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0'
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  metricValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
    fontWeight: '500'
  }
});
