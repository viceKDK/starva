import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import CustomContainerModal from './CustomContainerModal';

const { width } = Dimensions.get('window');

// Mock data - replace with actual data from context/database
const mockContainers = [
  { id: '1', name: 'Glass', volume: 250, type: 'wine-outline', color: '#4A90E2', isCustom: false },
  { id: '2', name: 'Bottle', volume: 500, type: 'bottle-outline', color: '#87CEEB', isCustom: false },
  { id: '3', name: 'Large Bottle', volume: 1000, type: 'flask-outline', color: '#4CAF50', isCustom: false },
  { id: '4', name: 'My Cup', volume: 350, type: 'cafe-outline', color: '#FF6B35', isCustom: true },
];

const FREQUENCY_OPTIONS = [
  { id: 'thirty', label: 'Every 30 minutes', minutes: 30 },
  { id: 'sixty', label: 'Every hour', minutes: 60 },
  { id: 'onetwenty', label: 'Every 2 hours', minutes: 120 },
  { id: 'custom', label: 'Custom', minutes: 90 },
];

const GOAL_PRESETS = [1500, 2000, 2500, 3000];

const SettingsScreen = () => {
  // Settings state
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationStartTime, setNotificationStartTime] = useState(new Date(2024, 0, 1, 8, 0));
  const [notificationEndTime, setNotificationEndTime] = useState(new Date(2024, 0, 1, 22, 0));
  const [notificationFrequency, setNotificationFrequency] = useState('sixty');
  const [units, setUnits] = useState('metric'); // metric or imperial
  const [theme, setTheme] = useState('light'); // light or dark
  const [containers, setContainers] = useState(mockContainers);
  
  // Modal states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const handleNotificationToggle = async (value) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotificationsEnabled(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive water reminders.',
          [{ text: 'OK' }]
        );
      }
    } else {
      setNotificationsEnabled(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGoalChange = (value) => {
    setDailyGoal(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGoalPreset = (preset) => {
    setDailyGoal(preset);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleTimeChange = (event, selectedTime, type) => {
    if (selectedTime) {
      if (type === 'start') {
        setNotificationStartTime(selectedTime);
        setShowStartTimePicker(false);
      } else {
        setNotificationEndTime(selectedTime);
        setShowEndTimePicker(false);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFrequencySelect = (frequencyId) => {
    setNotificationFrequency(frequencyId);
    setShowFrequencyModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContainerSave = (containerData) => {
    if (editingContainer) {
      setContainers(prev => prev.map(c => c.id === containerData.id ? containerData : c));
    } else {
      setContainers(prev => [...prev, containerData]);
    }
    setEditingContainer(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleContainerEdit = (container) => {
    setEditingContainer(container);
    setShowContainerModal(true);
  };

  const handleContainerDelete = (containerId) => {
    Alert.alert(
      'Delete Container',
      'Are you sure you want to delete this container?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setContainers(prev => prev.filter(c => c.id !== containerId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your water intake history, custom containers, and reset settings to defaults. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset logic would go here
            setShowResetConfirm(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Data Reset', 'All data has been reset to defaults.');
          },
        },
      ]
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getNextNotificationTime = () => {
    const now = new Date();
    const frequency = FREQUENCY_OPTIONS.find(f => f.id === notificationFrequency);
    const nextTime = new Date(now.getTime() + frequency.minutes * 60000);
    return formatTime(nextTime);
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({ icon, title, subtitle, onPress, rightComponent, disabled = false }) => (
    <TouchableOpacity
      style={[styles.settingRow, disabled && styles.disabledRow]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={disabled ? '#999' : '#4A90E2'} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  const ContainerItem = ({ container }) => (
    <View style={styles.containerItem}>
      <View style={styles.containerInfo}>
        <View style={[styles.containerIcon, { backgroundColor: container.color }]}>
          <Ionicons name={container.type} size={20} color="#FFFFFF" />
        </View>
        <View>
          <Text style={styles.containerName}>{container.name}</Text>
          <Text style={styles.containerVolume}>{container.volume}ml</Text>
        </View>
      </View>
      
      <View style={styles.containerActions}>
        {container.isCustom && (
          <>
            <TouchableOpacity
              style={styles.containerActionButton}
              onPress={() => handleContainerEdit(container)}
            >
              <Ionicons name="create-outline" size={20} color="#4A90E2" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.containerActionButton}
              onPress={() => handleContainerDelete(container.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B35" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Daily Goal Section */}
        <SettingSection title="Daily Goal">
          <View style={styles.goalContainer}>
            <View style={styles.goalDisplay}>
              <Text style={styles.goalValue}>{dailyGoal.toLocaleString()}</Text>
              <Text style={styles.goalUnit}>ml</Text>
            </View>
            
            <Slider
              style={styles.goalSlider}
              minimumValue={500}
              maximumValue={5000}
              value={dailyGoal}
              onValueChange={handleGoalChange}
              step={50}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#E8F4F8"
              thumbStyle={styles.sliderThumb}
            />
            
            <View style={styles.goalPresets}>
              {GOAL_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetButton, dailyGoal === preset && styles.activePreset]}
                  onPress={() => handleGoalPreset(preset)}
                >
                  <Text style={[styles.presetText, dailyGoal === preset && styles.activePresetText]}>
                    {preset === 1500 ? '1.5L' : `${preset / 1000}L`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SettingSection>

        {/* Notifications Section */}
        <SettingSection title="Notifications">
          <SettingRow
            icon="notifications-outline"
            title="Enable Reminders"
            subtitle={notificationsEnabled ? 'Water reminders are on' : 'Water reminders are off'}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#E8F4F8', true: '#4A90E2' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          
          <SettingRow
            icon="time-outline"
            title="Reminder Schedule"
            subtitle={`${formatTime(notificationStartTime)} - ${formatTime(notificationEndTime)}`}
            disabled={!notificationsEnabled}
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#999" />
            }
          />
          
          <View style={styles.timePickerRow}>
            <TouchableOpacity
              style={[styles.timeButton, !notificationsEnabled && styles.disabledButton]}
              onPress={() => setShowStartTimePicker(true)}
              disabled={!notificationsEnabled}
            >
              <Text style={[styles.timeButtonText, !notificationsEnabled && styles.disabledText]}>
                Start: {formatTime(notificationStartTime)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.timeButton, !notificationsEnabled && styles.disabledButton]}
              onPress={() => setShowEndTimePicker(true)}
              disabled={!notificationsEnabled}
            >
              <Text style={[styles.timeButtonText, !notificationsEnabled && styles.disabledText]}>
                End: {formatTime(notificationEndTime)}
              </Text>
            </TouchableOpacity>
          </View>
          
          <SettingRow
            icon="repeat-outline"
            title="Frequency"
            subtitle={FREQUENCY_OPTIONS.find(f => f.id === notificationFrequency)?.label}
            onPress={() => setShowFrequencyModal(true)}
            disabled={!notificationsEnabled}
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#999" />
            }
          />
          
          {notificationsEnabled && (
            <View style={styles.nextNotificationContainer}>
              <Text style={styles.nextNotificationText}>
                Next reminder: {getNextNotificationTime()}
              </Text>
            </View>
          )}
        </SettingSection>

        {/* Container Management Section */}
        <SettingSection title="My Containers">
          <View style={styles.containerList}>
            {containers.map(container => (
              <ContainerItem key={container.id} container={container} />
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.addContainerButton}
            onPress={() => {
              setEditingContainer(null);
              setShowContainerModal(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
            <Text style={styles.addContainerText}>Add Custom Container</Text>
          </TouchableOpacity>
        </SettingSection>

        {/* App Preferences Section */}
        <SettingSection title="Preferences">
          <SettingRow
            icon="speedometer-outline"
            title="Units"
            subtitle={units === 'metric' ? 'Metric (ml, L)' : 'Imperial (fl oz, cups)'}
            onPress={() => {
              setUnits(prev => prev === 'metric' ? 'imperial' : 'metric');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            rightComponent={
              <Text style={styles.unitToggleText}>
                {units === 'metric' ? 'ml/L' : 'fl oz'}
              </Text>
            }
          />
          
          <SettingRow
            icon="color-palette-outline"
            title="Theme"
            subtitle={theme === 'light' ? 'Light theme' : 'Dark theme'}
            onPress={() => {
              setTheme(prev => prev === 'light' ? 'dark' : 'light');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            rightComponent={
              <Text style={styles.themeToggleText}>
                {theme === 'light' ? 'Light' : 'Dark'}
              </Text>
            }
          />
          
          <SettingRow
            icon="warning-outline"
            title="Reset All Data"
            subtitle="Delete all data and restore defaults"
            onPress={handleResetData}
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#FF6B35" />
            }
          />
        </SettingSection>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={notificationStartTime}
          mode="time"
          display="default"
          onChange={(event, time) => handleTimeChange(event, time, 'start')}
        />
      )}
      
      {showEndTimePicker && (
        <DateTimePicker
          value={notificationEndTime}
          mode="time"
          display="default"
          onChange={(event, time) => handleTimeChange(event, time, 'end')}
        />
      )}

      {/* Frequency Modal */}
      <Modal
        visible={showFrequencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFrequencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.frequencyModal}>
            <Text style={styles.modalTitle}>Notification Frequency</Text>
            {FREQUENCY_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.frequencyOption,
                  notificationFrequency === option.id && styles.selectedFrequency
                ]}
                onPress={() => handleFrequencySelect(option.id)}
              >
                <Text style={[
                  styles.frequencyOptionText,
                  notificationFrequency === option.id && styles.selectedFrequencyText
                ]}>
                  {option.label}
                </Text>
                {notificationFrequency === option.id && (
                  <Ionicons name="checkmark" size={20} color="#4A90E2" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFrequencyModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Container Modal */}
      <CustomContainerModal
        visible={showContainerModal}
        onClose={() => {
          setShowContainerModal(false);
          setEditingContainer(null);
        }}
        onSave={handleContainerSave}
        editContainer={editingContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFFE',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 15,
    paddingVertical: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    minHeight: 60,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  disabledText: {
    color: '#999',
  },
  goalContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  goalDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 20,
  },
  goalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  goalUnit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 5,
  },
  goalSlider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
  sliderThumb: {
    backgroundColor: '#4A90E2',
    width: 20,
    height: 20,
  },
  goalPresets: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  presetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  activePreset: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  activePresetText: {
    color: '#FFFFFF',
  },
  timePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
  nextNotificationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nextNotificationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  containerList: {
    paddingHorizontal: 20,
  },
  containerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  containerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  containerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  containerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  containerVolume: {
    fontSize: 14,
    color: '#666',
  },
  containerActions: {
    flexDirection: 'row',
  },
  containerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  addContainerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  addContainerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 8,
  },
  unitToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    width: width * 0.8,
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  selectedFrequency: {
    backgroundColor: '#F0F9FF',
  },
  frequencyOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFrequencyText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SettingsScreen;