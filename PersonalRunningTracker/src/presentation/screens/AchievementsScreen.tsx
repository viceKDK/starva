import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '@/shared/types';
import { Achievement } from '@/domain/entities/Achievement';
import { GetAllAchievementsUseCase } from '@/application/usecases/GetAllAchievementsUseCase';
import { SQLiteAchievementRepository } from '@/infrastructure/persistence/SQLiteAchievementRepository';

type AchievementsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Achievements'>;

interface Props {
  navigation: AchievementsScreenNavigationProp;
}

interface AchievementItemProps {
  achievement: Achievement;
  onPress: () => void;
  onShare: () => void;
}

const AchievementItem: React.FC<AchievementItemProps> = ({ achievement, onPress, onShare }) => {
  const difficultyColors = {
    Easy: '#4CAF50',
    Medium: '#FF9800',
    Hard: '#F44336',
    Epic: '#9C27B0'
  };

  const difficulty = achievement.getDifficulty();
  const difficultyColor = difficultyColors[difficulty];

  return (
    <TouchableOpacity style={styles.achievementCard} onPress={onPress}>
      <View style={styles.achievementHeader}>
        <View style={[styles.achievementIcon, { backgroundColor: achievement.getColor() + '20' }]}>
          <Ionicons name={achievement.getIconName() as any} size={24} color={achievement.getColor()} />
        </View>
        <View style={styles.achievementInfo}>
          <Text style={styles.achievementTitle}>{achievement.title}</Text>
          <Text style={styles.achievementDescription}>{achievement.description}</Text>
          <Text style={styles.achievementDate}>Earned on {achievement.getFormattedDate()}</Text>
        </View>
      </View>

      <View style={styles.achievementFooter}>
        <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
          <Text style={styles.difficultyText}>{difficulty}</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <Ionicons name="share-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

interface EmptyStateProps {
  onStartRun: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onStartRun }) => (
  <View style={styles.emptyState}>
    <Ionicons name="medal-outline" size={64} color="#ccc" />
    <Text style={styles.emptyStateTitle}>No Achievements Yet</Text>
    <Text style={styles.emptyStateSubtitle}>
      Start running to unlock your first achievements!
    </Text>
    <TouchableOpacity style={styles.startRunButton} onPress={onStartRun}>
      <Text style={styles.startRunButtonText}>Start Your First Run</Text>
    </TouchableOpacity>
  </View>
);

interface StatsHeaderProps {
  totalAchievements: number;
  latestAchievement?: Achievement;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({ totalAchievements, latestAchievement }) => {
  const achievementsByDifficulty = useMemo(() => {
    // This would need to be calculated from all achievements
    // For now, we'll just show placeholder data
    return {
      Easy: 0,
      Medium: 0,
      Hard: 0,
      Epic: 0
    };
  }, []);

  return (
    <View style={styles.statsHeader}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalAchievements}</Text>
        <Text style={styles.statLabel}>Total Achievements</Text>
      </View>
      {latestAchievement && (
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{latestAchievement.title}</Text>
          <Text style={styles.statLabel}>Latest Achievement</Text>
        </View>
      )}
    </View>
  );
};

export const AchievementsScreen: React.FC<Props> = ({ navigation }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize use case
  const getAllAchievementsUseCase = useMemo(
    () => new GetAllAchievementsUseCase(new SQLiteAchievementRepository()),
    []
  );

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllAchievementsUseCase.execute();

      if (result.success) {
        setAchievements(result.data);
      } else {
        setError('Failed to load achievements');
        Alert.alert('Error', 'Failed to load achievements');
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
      setError('Failed to load achievements');
      Alert.alert('Error', 'Failed to load achievements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAchievements();
    setIsRefreshing(false);
  };

  const handleAchievementPress = (achievement: Achievement) => {
    // Navigate to the specific run that earned this achievement
    if (achievement.runId) {
      navigation.navigate('RunDetail', { runId: achievement.runId.value });
    }
  };

  const handleShare = async (achievement: Achievement) => {
    try {
      await Share.share({
        message: achievement.getShareText(),
        title: achievement.title
      });
    } catch (error) {
      console.error('Failed to share achievement:', error);
    }
  };

  const handleStartRun = () => {
    navigation.navigate('Tracking');
  };

  const latestAchievement = achievements.length > 0 ? achievements[0] : undefined;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && achievements.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAchievements}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={achievements}
        renderItem={({ item }) => (
          <AchievementItem
            achievement={item}
            onPress={() => handleAchievementPress(item)}
            onShare={() => handleShare(item)}
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
          achievements.length > 0 ? (
            <StatsHeader
              totalAchievements={achievements.length}
              latestAchievement={latestAchievement}
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
  achievementCard: {
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
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  achievementInfo: {
    flex: 1
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20
  },
  achievementDate: {
    fontSize: 12,
    color: '#999'
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  shareButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa'
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
  }
});