import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Animated,
  PanGestureHandler,
  State,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Rect,
  Text as SvgText,
  Line,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 200;

// Mock data structure - replace with actual data from props/context
const mockStatsData = {
  daily: {
    consumed: 1650,
    goal: 2000,
    streak: 7,
    hourly: [0, 0, 0, 0, 0, 0, 250, 200, 150, 300, 250, 200, 150, 100, 0, 0, 150, 0, 0, 0, 0, 0, 0, 0],
  },
  weekly: [
    { date: '2025-01-27', consumed: 1800, goal: 2000, dayName: 'Mon' },
    { date: '2025-01-28', consumed: 2100, goal: 2000, dayName: 'Tue' },
    { date: '2025-01-29', consumed: 1650, goal: 2000, dayName: 'Wed' },
    { date: '2025-01-30', consumed: 2200, goal: 2000, dayName: 'Thu' },
    { date: '2025-01-31', consumed: 1900, goal: 2000, dayName: 'Fri' },
    { date: '2025-02-01', consumed: 1750, goal: 2000, dayName: 'Sat' },
    { date: '2025-02-02', consumed: 1650, goal: 2000, dayName: 'Sun' },
  ],
  monthly: Array.from({ length: 31 }, (_, i) => ({
    date: `2025-01-${String(i + 1).padStart(2, '0')}`,
    consumed: Math.floor(Math.random() * 1000) + 1200,
    day: i + 1,
  })),
};

const StatsScreen = ({ statsData = mockStatsData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabs = ['Daily', 'Weekly', 'Monthly'];

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const switchTab = (index) => {
    setActiveTab(index);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  };

  // Daily View Components
  const DailyCircularProgress = ({ consumed, goal }) => {
    const percentage = Math.min((consumed / goal) * 100, 100);
    const circumference = 2 * Math.PI * 80;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer}>
        <Svg width={200} height={200}>
          <Defs>
            <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4A90E2" />
              <Stop offset="100%" stopColor="#87CEEB" />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={100}
            cy={100}
            r={80}
            stroke="#E8F4F8"
            strokeWidth={12}
            fill="none"
          />
          <Circle
            cx={100}
            cy={100}
            r={80}
            stroke="url(#progressGradient)"
            strokeWidth={12}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
          <SvgText
            x={100}
            y={90}
            textAnchor="middle"
            fontSize={24}
            fontWeight="bold"
            fill="#4A90E2"
          >
            {consumed}ml
          </SvgText>
          <SvgText
            x={100}
            y={115}
            textAnchor="middle"
            fontSize={16}
            fill="#666"
          >
            of {goal}ml
          </SvgText>
        </Svg>
      </View>
    );
  };

  const HourlyBars = ({ hourlyData }) => {
    const maxValue = Math.max(...hourlyData, 1);
    const barWidth = (CHART_WIDTH - 60) / 24;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Hourly Consumption</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {hourlyData.map((value, index) => {
            const barHeight = (value / maxValue) * (CHART_HEIGHT - 60);
            return (
              <G key={index}>
                <Rect
                  x={30 + index * barWidth + 2}
                  y={CHART_HEIGHT - 30 - barHeight}
                  width={barWidth - 4}
                  height={barHeight}
                  fill={value > 0 ? "#4A90E2" : "#E8F4F8"}
                  rx={2}
                />
                {index % 4 === 0 && (
                  <SvgText
                    x={30 + index * barWidth + barWidth / 2}
                    y={CHART_HEIGHT - 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#666"
                  >
                    {index}h
                  </SvgText>
                )}
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  // Weekly View Components
  const WeeklyBarChart = ({ weeklyData }) => {
    const maxValue = Math.max(...weeklyData.map(d => Math.max(d.consumed, d.goal)));
    const barWidth = (CHART_WIDTH - 80) / 14; // Space for 7 days with goals

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Progress</Text>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {weeklyData.map((day, index) => {
            const consumedHeight = (day.consumed / maxValue) * (CHART_HEIGHT - 60);
            const goalHeight = (day.goal / maxValue) * (CHART_HEIGHT - 60);
            const xPos = 40 + index * barWidth * 2;

            return (
              <G key={index}>
                {/* Goal bar (background) */}
                <Rect
                  x={xPos}
                  y={CHART_HEIGHT - 30 - goalHeight}
                  width={barWidth - 2}
                  height={goalHeight}
                  fill="#E8F4F8"
                  rx={2}
                />
                {/* Consumed bar */}
                <Rect
                  x={xPos}
                  y={CHART_HEIGHT - 30 - consumedHeight}
                  width={barWidth - 2}
                  height={consumedHeight}
                  fill={day.consumed >= day.goal ? "#4CAF50" : "#4A90E2"}
                  rx={2}
                />
                {/* Day label */}
                <SvgText
                  x={xPos + barWidth / 2}
                  y={CHART_HEIGHT - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#666"
                >
                  {day.dayName}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  // Monthly View Components
  const MonthlyHeatMap = ({ monthlyData }) => {
    const maxValue = Math.max(...monthlyData.map(d => d.consumed));
    const minValue = Math.min(...monthlyData.map(d => d.consumed));
    const cellSize = (CHART_WIDTH - 60) / 7;
    const weeks = Math.ceil(monthlyData.length / 7);

    const getIntensity = (value) => {
      const normalized = (value - minValue) / (maxValue - minValue);
      return Math.max(0.2, normalized);
    };

    const getColor = (intensity) => {
      const opacity = intensity;
      return `rgba(74, 144, 226, ${opacity})`;
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Monthly Heat Map</Text>
        <Svg width={CHART_WIDTH} height={weeks * cellSize + 40}>
          {monthlyData.map((day, index) => {
            const row = Math.floor(index / 7);
            const col = index % 7;
            const intensity = getIntensity(day.consumed);

            return (
              <G key={index}>
                <Rect
                  x={30 + col * cellSize + 2}
                  y={20 + row * cellSize + 2}
                  width={cellSize - 4}
                  height={cellSize - 4}
                  fill={getColor(intensity)}
                  rx={4}
                />
                <SvgText
                  x={30 + col * cellSize + cellSize / 2}
                  y={20 + row * cellSize + cellSize / 2 + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#fff"
                  fontWeight="bold"
                >
                  {day.day}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  const StatCard = ({ title, value, subtitle, icon, color = "#4A90E2" }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderDailyView = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <DailyCircularProgress
        consumed={statsData.daily.consumed}
        goal={statsData.daily.goal}
      />
      
      <View style={styles.statsRow}>
        <StatCard
          title="Streak"
          value={`${statsData.daily.streak} days`}
          icon="flame"
          color="#FF6B35"
        />
        <StatCard
          title="Progress"
          value={`${Math.round((statsData.daily.consumed / statsData.daily.goal) * 100)}%`}
          icon="trending-up"
          color="#4CAF50"
        />
      </View>

      <HourlyBars hourlyData={statsData.daily.hourly} />
    </ScrollView>
  );

  const renderWeeklyView = () => {
    const weeklyAverage = Math.round(
      statsData.weekly.reduce((sum, day) => sum + day.consumed, 0) / statsData.weekly.length
    );
    const goalsMet = statsData.weekly.filter(day => day.consumed >= day.goal).length;

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          <StatCard
            title="Weekly Average"
            value={`${weeklyAverage}ml`}
            icon="analytics"
            color="#4A90E2"
          />
          <StatCard
            title="Goals Met"
            value={`${goalsMet}/7`}
            subtitle="days"
            icon="checkmark-circle"
            color="#4CAF50"
          />
        </View>

        <WeeklyBarChart weeklyData={statsData.weekly} />

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Goal Met</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4A90E2' }]} />
            <Text style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#E8F4F8' }]} />
            <Text style={styles.legendText}>Goal Target</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderMonthlyView = () => {
    const monthlyTotal = statsData.monthly.reduce((sum, day) => sum + day.consumed, 0);
    const monthlyAverage = Math.round(monthlyTotal / statsData.monthly.length);
    const bestDay = statsData.monthly.reduce((max, day) => 
      day.consumed > max.consumed ? day : max
    );
    const worstDay = statsData.monthly.reduce((min, day) => 
      day.consumed < min.consumed ? day : min
    );

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          <StatCard
            title="Monthly Total"
            value={`${(monthlyTotal / 1000).toFixed(1)}L`}
            icon="water"
            color="#4A90E2"
          />
          <StatCard
            title="Daily Average"
            value={`${monthlyAverage}ml`}
            icon="analytics"
            color="#87CEEB"
          />
        </View>

        <MonthlyHeatMap monthlyData={statsData.monthly} />

        <View style={styles.statsRow}>
          <StatCard
            title="Best Day"
            value={`${bestDay.consumed}ml`}
            subtitle={`Day ${bestDay.day}`}
            icon="trophy"
            color="#4CAF50"
          />
          <StatCard
            title="Lowest Day"
            value={`${worstDay.consumed}ml`}
            subtitle={`Day ${worstDay.day}`}
            icon="alert-circle"
            color="#FF6B35"
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <View style={styles.tabContainer}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => switchTab(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveTab(newIndex);
        }}
      >
        <View style={styles.page}>
          {renderDailyView()}
        </View>
        <View style={styles.page}>
          {renderWeeklyView()}
        </View>
        <View style={styles.page}>
          {renderMonthlyView()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFFE',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F4F8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  page: {
    width: width,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCardSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginVertical: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default StatsScreen;