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
import ViewShot from 'react-native-view-shot';

import { RootStackParamList } from '@/shared/types';
import { Achievement } from '@/domain/entities/Achievement';
import { GetAllAchievementsUseCase } from '@/application/usecases/GetAllAchievementsUseCase';
import { GetAchievementsProgressUseCase } from '@/application/usecases/GetAchievementsProgressUseCase';
import { SQLiteAchievementRepository } from '@/infrastructure/persistence/SQLiteAchievementRepository';
import { SQLiteRunRepository } from '@/infrastructure/persistence/SQLiteRunRepository';
import * as Clipboard from 'expo-clipboard';

type AchievementsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Achievements'>;

interface Props {
  navigation: AchievementsScreenNavigationProp;
}

interface AchievementItemProps {
  achievement: Achievement;
  onPress: () => void;
  onShare: () => void;
  onCopy: () => void;
}

const AchievementItem: React.FC<AchievementItemProps> = ({ achievement, onPress, onShare, onCopy }) => {
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
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.shareButton} onPress={onCopy}>
            <Ionicons name="copy-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareButton, { marginLeft: 8 }]} onPress={onShare}>
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareButton, { marginLeft: 8 }]} onPress={onCopy}>
            <Ionicons name="image-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
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
  const [filter, setFilter] = useState<'ALL' | 'DISTANCE_MILESTONE' | 'VOLUME' | 'FREQUENCY' | 'SPEED' | 'CONSISTENCY'>('ALL');
  const [progressItems, setProgressItems] = useState<{
    key: string;
    title: string;
    detail: string;
    progress: number;
    current: number;
    target: number;
    unit: string;
  }[]>([]);
  const [shareCardAchievement, setShareCardAchievement] = useState<Achievement | null>(null);
  const viewShotRef = React.useRef<ViewShot>(null);

  // Initialize use case
  const getAllAchievementsUseCase = useMemo(
    () => new GetAllAchievementsUseCase(new SQLiteAchievementRepository()),
    []
  );
  const getAchievementsProgressUseCase = useMemo(
    () => new GetAchievementsProgressUseCase(new SQLiteRunRepository(), new SQLiteAchievementRepository()),
    []
  );
  // Lazy import to avoid circulars in header
  const backfillAchievementsUseCase = useMemo(() => {
    const { BackfillAchievementsUseCase } = require('@/application/usecases/BackfillAchievementsUseCase');
    return new BackfillAchievementsUseCase(new SQLiteRunRepository(), new SQLiteAchievementRepository());
  }, []);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllAchievementsUseCase.execute();

      if (result.success) {
        if (result.data.length === 0) {
          const backfill = await backfillAchievementsUseCase.execute();
          if (!backfill.success) {
            console.error('Achievements backfill failed:', backfill.error);
          }
          const reload = await getAllAchievementsUseCase.execute();
          setAchievements(reload.success ? reload.data : []);
        } else {
          setAchievements(result.data);
        }
        const prog = await getAchievementsProgressUseCase.execute();
        if (prog.success) {
          setProgressItems(prog.data);
        }
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

  const _handleCopy = async (achievement: Achievement) => {
    try {
      await Clipboard.setStringAsync(achievement.getShareText());
      Alert.alert('Copied', 'Achievement text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy achievement:', error);
    }
  };

  const handleExportImage = async (achievement: Achievement) => {
    try {
      setShareCardAchievement(achievement);
      await new Promise(r => setTimeout(r, 50));
      const uri = await viewShotRef.current?.capture?.();
      if (uri) {
        await Share.share({ url: uri, title: achievement.title, message: achievement.title });
      }
    } catch (error) {
      console.error('Failed to export achievement image:', error);
      Alert.alert('Export Failed', 'Could not generate image');
    } finally {
      setShareCardAchievement(null);
    }
  };

  // handled inline in ListEmptyComponent

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

  const filtered = achievements.filter(a => filter === 'ALL' ? true : a.type === filter);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <AchievementItem
            achievement={item}
            onPress={() => handleAchievementPress(item)}
            onShare={() => handleShare(item)}
            onCopy={() => handleExportImage(item)}
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
          <>
            <StatsHeader
              totalAchievements={filtered.length}
              {...(latestAchievement ? { latestAchievement } : {})}
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} onPress={async () => {
                const lines = achievements.map(a => `• ${a.title} — ${a.description}${a.getFormattedDate() ? ` (Earned on ${a.getFormattedDate()})` : ''}`);
                const text = `Achievements Summary\n\n${lines.join('\n')}`;
                await Clipboard.setStringAsync(text);
                Alert.alert('Copied', 'Achievements summary copied to clipboard');
              }}>
                <Ionicons name="copy-outline" size={16} color="#FF6B35" />
                <Text style={styles.actionSecondaryText}>Copy Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.actionPrimary]} onPress={async () => {
                const lines = achievements.map(a => `• ${a.title} — ${a.description}${a.getFormattedDate() ? ` (Earned on ${a.getFormattedDate()})` : ''}`);
                const text = `Achievements Summary\n\n${lines.join('\n')}`;
                await Share.share({ message: text, title: 'Achievements Summary' });
              }}>
                <Ionicons name="share-outline" size={16} color="#fff" />
                <Text style={styles.actionPrimaryText}>Export Summary</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterRow}>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'DISTANCE_MILESTONE', label: 'Distance' },
                { key: 'VOLUME', label: 'Volume' },
                { key: 'FREQUENCY', label: 'Frequency' },
                { key: 'SPEED', label: 'Speed' },
                { key: 'CONSISTENCY', label: 'Streaks' }
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setFilter(opt.key as any)}
                  style={[styles.filterChip, filter === (opt.key as any) && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, filter === (opt.key as any) && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {progressItems.length > 0 && (
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Progress</Text>
                {progressItems.map(item => (
                  <View key={item.key} style={styles.progressItem}>
                    <View style={styles.progressHeaderRow}>
                      <Text style={styles.progressLabel}>{item.title}</Text>
                      <Text style={styles.progressPercent}>{Math.round(item.progress * 100)}%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(item.progress * 100, 100)}%` }]} />
                    </View>
                    <Text style={styles.progressSubtext}>{item.detail} • {item.current}{item.unit} / {item.target}{item.unit}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        }
        ListEmptyComponent={<EmptyState onStartRun={() => navigation.navigate('MainTabs', { screen: 'Tracking' })} />}
      />

      {shareCardAchievement && (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.viewShotContainer}>
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <Ionicons name="medal-outline" size={20} color="#FF6B35" />
              <Text style={styles.cardTitle}>Achievement Unlocked</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={[styles.cardIconCircle, { backgroundColor: shareCardAchievement.getColor() + '20' }]}>
                <Ionicons name={shareCardAchievement.getIconName() as any} size={42} color={shareCardAchievement.getColor()} />
              </View>
              <Text style={styles.cardAchievementTitle}>{shareCardAchievement.title}</Text>
              <Text style={styles.cardAchievementDesc}>{shareCardAchievement.description}</Text>
              <Text style={styles.cardFooterText}>{shareCardAchievement.getFormattedDate()}</Text>
            </View>
            <View style={styles.cardBranding}>
              <Text style={styles.cardBrandingText}>PersonalRunningTracker</Text>
            </View>
          </View>
        </ViewShot>
      )}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f1f3'
  },
  filterChipActive: {
    backgroundColor: '#FF6B35'
  },
  filterChipText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  progressSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12
  },
  progressItem: {
    marginBottom: 12
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  progressPercent: {
    fontSize: 12,
    color: '#666'
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#eaecef',
    borderRadius: 6,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35'
  },
  progressSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: '#666'
  },
  viewShotContainer: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    width: 600,
    height: 600,
    backgroundColor: '#f8f9fa',
    padding: 24
  },
  cardContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35'
  },
  cardBody: {
    alignItems: 'center',
    paddingHorizontal: 12
  },
  cardIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  cardAchievementTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6
  },
  cardAchievementDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 6
  },
  cardFooterText: {
    fontSize: 12,
    color: '#999'
  },
  cardBranding: {
    alignItems: 'center'
  },
  cardBrandingText: {
    fontSize: 12,
    color: '#aaa'
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionPrimary: {
    backgroundColor: '#FF6B35'
  },
  actionSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  actionPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  actionSecondaryText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600'
  }
});
