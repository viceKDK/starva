import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { CircularProgress } from 'react-native-circular-progress';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useApp } from '../context/AppContext';
import CustomContainerModal from './CustomContainerModal';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const { 
    currentIntake, 
    dailyGoal, 
    containers, 
    loading, 
    logWater, 
    addContainer,
  } = useApp();

  const [animatedValue] = useState(new Animated.Value(0));
  const [showContainerModal, setShowContainerModal] = useState(false);
  
  const progressPercentage = Math.min((currentIntake / dailyGoal) * 100, 100);
  
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progressPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [currentIntake]);

  const getCurrentDate = () => {
    const today = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  };

  const handleLogWater = async (amount, containerId = null) => {
    try {
      await logWater(amount, containerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to log water:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleContainerSave = async (containerData) => {
    try {
      await addContainer(containerData);
      setShowContainerModal(false);
    } catch (error) {
      console.error('Failed to add container:', error);
    }
  };

  const HumanSilhouette = ({ fillPercentage }) => {
    return (
      <Svg width={120} height={200} viewBox="0 0 120 200">
        <Defs>
          <SvgLinearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor="#00B4DB" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#0083B0" stopOpacity="0.9" />
          </SvgLinearGradient>
          <clipPath id="waterClip">
            <Rect
              x="0"
              y={200 - (fillPercentage * 2)}
              width="120"
              height={fillPercentage * 2}
            />
          </clipPath>
        </Defs>
        
        {/* Human silhouette outline */}
        <Path
          d="M60 20 C65 15, 75 15, 80 25 C85 35, 80 45, 75 50 L85 60 L85 120 L95 180 L85 195 L75 195 L70 160 L50 160 L45 195 L35 195 L25 180 L35 120 L35 60 L45 50 C40 45, 35 35, 40 25 C45 15, 55 15, 60 20 Z"
          fill="none"
          stroke="#E0E0E0"
          strokeWidth="2"
        />
        
        {/* Water fill */}
        <Path
          d="M60 20 C65 15, 75 15, 80 25 C85 35, 80 45, 75 50 L85 60 L85 120 L95 180 L85 195 L75 195 L70 160 L50 160 L45 195 L35 195 L25 180 L35 120 L35 60 L45 50 C40 45, 35 35, 40 25 C45 15, 55 15, 60 20 Z"
          fill="url(#waterGradient)"
          clipPath="url(#waterClip)"
        />
      </Svg>
    );
  };

  const ContainerButton = ({ container, onPress }) => (
    <TouchableOpacity 
      style={styles.containerButton} 
      onPress={() => onPress(container.volume, container.id)}
    >
      <View style={[styles.containerIconContainer, { backgroundColor: container.color }]}>
        <Ionicons name={container.type} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.containerLabel}>{container.name}</Text>
      <Text style={styles.containerAmount}>{container.volume}ml</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FFFE" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{getCurrentDate()}</Text>
        <View style={styles.progressHeader}>
          <Text style={styles.intakeText}>
            {currentIntake.toLocaleString()}ml
          </Text>
          <Text style={styles.goalText}>/ {dailyGoal.toLocaleString()}ml</Text>
        </View>
      </View>

      {/* Main Visualization Area */}
      <View style={styles.visualizationContainer}>
        <View style={styles.circularProgressContainer}>
          <CircularProgress
            size={280}
            width={8}
            fill={progressPercentage}
            tintColor="#00B4DB"
            backgroundColor="#E8F4F8"
            rotation={0}
            lineCap="round"
          >
            {() => (
              <View style={styles.humanContainer}>
                <HumanSilhouette fillPercentage={progressPercentage} />
                <Text style={styles.percentageText}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
            )}
          </CircularProgress>
        </View>
        
        {/* Motivational Text */}
        <Text style={styles.motivationText}>
          {progressPercentage >= 100 
            ? "🎉 Goal achieved! Great job!" 
            : progressPercentage >= 75 
            ? "Almost there! Keep it up!" 
            : progressPercentage >= 50 
            ? "You're halfway there!" 
            : "Let's start hydrating!"}
        </Text>
      </View>

      {/* Quick Log Panel */}
      <View style={styles.quickLogPanel}>
        <Text style={styles.quickLogTitle}>Quick Log</Text>
        
        <View style={styles.containerButtonsRow}>
          {containers.slice(0, 3).map((container) => (
            <ContainerButton
              key={container.id}
              container={container}
              onPress={handleLogWater}
            />
          ))}
        </View>

        {/* Custom Container Button */}
        <TouchableOpacity 
          style={styles.customButton}
          onPress={() => setShowContainerModal(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
          <Text style={styles.customButtonText}>Add Custom Container</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Container Modal */}
      <CustomContainerModal
        visible={showContainerModal}
        onClose={() => setShowContainerModal(false)}
        onSave={handleContainerSave}
      />
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
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  intakeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00B4DB',
  },
  goalText: {
    fontSize: 18,
    color: '#888',
    marginLeft: 4,
  },
  visualizationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  humanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00B4DB',
    marginTop: 10,
  },
  motivationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  quickLogPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickLogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  containerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  containerButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  containerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#00B4DB',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  containerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  containerAmount: {
    fontSize: 12,
    color: '#00B4DB',
    fontWeight: '500',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 15,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  customButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen;