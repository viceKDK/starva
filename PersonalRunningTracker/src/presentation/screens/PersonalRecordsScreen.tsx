import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '@/shared/types';
import { PersonalRecord } from '@/domain/entities/PersonalRecord';
import { GetAllPersonalRecordsUseCase } from '@/application/usecases/GetAllPersonalRecordsUseCase';
import { SQLitePersonalRecordRepository } from '@/infrastructure/persistence/SQLitePersonalRecordRepository';

type PersonalRecordsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PersonalRecords'>;

interface Props {
  navigation: PersonalRecordsScreenNavigationProp;
}

interface PersonalRecordItemProps {
  record: PersonalRecord;
  onPress: () => void;
}

const PersonalRecordItem: React.FC<PersonalRecordItemProps> = ({ record, onPress }) => {
  const getIconName = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'LONGEST_DISTANCE':
        return 'trail-sign-outline';
      case 'LONGEST_DURATION':
        return 'time-outline';
      case 'FASTEST_5K':
      case 'FASTEST_10K':
      case 'FASTEST_HALF_MARATHON':
        return 'timer-outline';
      case 'BEST_PACE_1K':
      case 'BEST_PACE_5K':
        return 'speedometer-outline';
      default:
        return 'trophy-outline';
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <TouchableOpacity style={styles.recordCard} onPress={onPress}>
      <View style={styles.recordHeader}>
        <View style={styles.recordIcon}>
          <Ionicons name={getIconName(record.category)} size={24} color="#FF6B35" />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle}>{record.getDisplayTitle()}</Text>
          <Text style={styles.recordDate}>Achieved on {formatDate(record.achievedAt)}</Text>
        </View>
      </View>

      <View style={styles.recordValue}>
        <Text style={styles.recordValueText}>{record.getDisplayValue()}</Text>
        {record.isImprovement() && record.previousValue !== undefined && (
          <Text style={styles.improvementText}>{record.getImprovementText()}</Text>
        )}
      </View>

      <View style={styles.recordChevron}>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );
};

interface EmptyStateProps {
  onStartRun: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onStartRun }) => (
  <View style={styles.emptyState}>
    <Ionicons name="trophy-outline" size={64} color="#ccc" />
    <Text style={styles.emptyStateTitle}>No Personal Records Yet</Text>
    <Text style={styles.emptyStateSubtitle}>
      Start running to set your first personal records!
    </Text>
    <TouchableOpacity style={styles.startRunButton} onPress={onStartRun}>
      <Text style={styles.startRunButtonText}>Start Your First Run</Text>
    </TouchableOpacity>
  </View>
);

interface StatsHeaderProps {
  totalRecords: number;
  latestRecord?: PersonalRecord;
  onViewAchievements: () => void;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({ totalRecords, latestRecord, onViewAchievements }) => (
  <View>
    <View style={styles.statsHeader}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalRecords}</Text>
        <Text style={styles.statLabel}>Personal Records</Text>
      </View>
      {latestRecord && (
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{latestRecord.getDisplayTitle()}</Text>
          <Text style={styles.statLabel}>Latest Achievement</Text>
        </View>
      )}
    </View>

    <TouchableOpacity style={styles.achievementsButton} onPress={onViewAchievements}>
      <Ionicons name="medal-outline" size={20} color="#FF6B35" />
      <Text style={styles.achievementsButtonText}>View Achievements</Text>
      <Ionicons name="chevron-forward" size={20} color="#FF6B35" />
    </TouchableOpacity>
  </View>
);

export const PersonalRecordsScreen: React.FC<Props> = ({ navigation }) => {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize use case
  const getAllRecordsUseCase = useMemo(
    () => new GetAllPersonalRecordsUseCase(new SQLitePersonalRecordRepository()),
    []
  );

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllRecordsUseCase.execute();

      if (result.success) {
        setRecords(result.data);
      } else {
        setError('Failed to load personal records');
        Alert.alert('Error', 'Failed to load personal records');
      }
    } catch (error) {
      console.error('Failed to load personal records:', error);
      setError('Failed to load personal records');
      Alert.alert('Error', 'Failed to load personal records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRecords();
    setIsRefreshing(false);
  };

  const handleRecordPress = (record: PersonalRecord) => {
    // Navigate to the specific run that set this record
    navigation.navigate('RunDetail', { runId: record.runId.value });
  };

  const handleStartRun = () => {
    navigation.navigate('Tracking');
  };

  const handleViewAchievements = () => {
    navigation.navigate('Achievements');
  };

  const latestRecord = records.length > 0 ? records[0] : undefined;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading personal records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && records.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRecords}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={records}
        renderItem={({ item }) => (
          <PersonalRecordItem
            record={item}
            onPress={() => handleRecordPress(item)}
          />
        )}
        keyExtractor={(item) => item.id.value}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
        ListHeaderComponent={
          records.length > 0 ? (
            <StatsHeader
              totalRecords={records.length}
              latestRecord={latestRecord}
              onViewAchievements={handleViewAchievements}
            />
          ) : null
        }
        ListEmptyComponent={<EmptyState onStartRun={handleStartRun} />}
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
  listContainer: {
    flexGrow: 1,
    padding: 16
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  recordInfo: {
    flex: 1
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  recordDate: {
    fontSize: 12,
    color: '#666'
  },
  recordValue: {
    alignItems: 'flex-end',
    marginRight: 8
  },
  recordValueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 2
  },
  improvementText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '500'
  },
  recordChevron: {
    opacity: 0.5
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24
  },
  startRunButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12
  },
  startRunButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  achievementsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff5f0',
    borderRadius: 8,
    padding: 16,
    marginTop: 12
  },
  achievementsButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 8
  }
});