import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  ActionSheetIOS
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '@/shared/types';
import { UserPreferencesEntity, DistanceUnit, PaceFormat, GPSAccuracy } from '@/domain/entities/UserPreferences';
import { GetUserPreferencesUseCase, UpdateUserPreferencesUseCase, ResetUserPreferencesUseCase, DataIntegrityCheckUseCase } from '@/application/usecases';
import { AsyncStorageUserPreferencesRepository } from '@/infrastructure/storage/AsyncStorageUserPreferencesRepository';
import { SQLiteRunRepository } from '@/infrastructure/persistence';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

interface SettingRowProps {
  title: string;
  subtitle?: string;
  icon: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  disabled?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  rightComponent,
  disabled = false
}) => (
  <TouchableOpacity
    style={[styles.settingRow, disabled && styles.settingRowDisabled]}
    onPress={onPress}
    disabled={disabled || !onPress}
  >
    <View style={styles.settingLeft}>
      <Ionicons name={icon as any} size={24} color={disabled ? "#ccc" : "#FF6B35"} />
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.settingRight}>
      {rightComponent}
      {onPress && !rightComponent && (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </View>
  </TouchableOpacity>
);

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [preferences, setPreferences] = useState<UserPreferencesEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize use cases
  const preferencesRepository = useMemo(() => new AsyncStorageUserPreferencesRepository(), []);
  const runRepository = useMemo(() => new SQLiteRunRepository(), []);
  const getPreferencesUseCase = useMemo(() => new GetUserPreferencesUseCase(preferencesRepository), [preferencesRepository]);
  const updatePreferencesUseCase = useMemo(() => new UpdateUserPreferencesUseCase(preferencesRepository), [preferencesRepository]);
  const resetPreferencesUseCase = useMemo(() => new ResetUserPreferencesUseCase(preferencesRepository), [preferencesRepository]);
  const dataIntegrityUseCase = useMemo(() => new DataIntegrityCheckUseCase(runRepository), [runRepository]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const result = await getPreferencesUseCase.execute();
      if (result.success) {
        setPreferences(result.data);
      } else {
        Alert.alert('Error', 'Failed to load settings');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async <K extends keyof UserPreferencesEntity>(
    key: K,
    value: any
  ) => {
    if (!preferences) return;

    setIsSaving(true);
    try {
      const result = await updatePreferencesUseCase.execute(key as any, value);
      if (result.success) {
        setPreferences(result.data);
      } else {
        Alert.alert('Error', 'Failed to save setting');
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const showDistanceUnitPicker = () => {
    if (!preferences) return;

    const options = ['Kilometers (km)', 'Miles (mi)', 'Cancel'];
    const destructiveButtonIndex = -1;
    const cancelButtonIndex = 2;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex,
        cancelButtonIndex,
        title: 'Distance Unit'
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          updatePreference('distanceUnit', 'km');
        } else if (buttonIndex === 1) {
          updatePreference('distanceUnit', 'mi');
        }
      }
    );
  };

  const showPaceFormatPicker = () => {
    if (!preferences) return;

    const options = ['Minutes per KM', 'Minutes per Mile', 'KM per Hour', 'Miles per Hour', 'Cancel'];
    const cancelButtonIndex = 4;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: 'Pace Format'
      },
      (buttonIndex) => {
        const formats: PaceFormat[] = ['min_per_km', 'min_per_mi', 'kph', 'mph'];
        if (buttonIndex >= 0 && buttonIndex < formats.length) {
          updatePreference('paceFormat', formats[buttonIndex]);
        }
      }
    );
  };

  const showGPSAccuracyPicker = () => {
    if (!preferences) return;

    const options = ['High (Best accuracy)', 'Balanced (Good battery)', 'Low (Best battery)', 'Cancel'];
    const cancelButtonIndex = 3;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: 'GPS Accuracy'
      },
      (buttonIndex) => {
        const accuracies: GPSAccuracy[] = ['high', 'balanced', 'low'];
        if (buttonIndex >= 0 && buttonIndex < accuracies.length) {
          updatePreference('gpsAccuracy', accuracies[buttonIndex]);
        }
      }
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to their default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const result = await resetPreferencesUseCase.execute();
              if (result.success) {
                setPreferences(result.data);
                Alert.alert('Success', 'Settings have been reset to defaults');
              } else {
                Alert.alert('Error', 'Failed to reset settings');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleDataIntegrityCheck = async () => {
    Alert.alert(
      'Data Integrity Check',
      'This will analyze all your run data for quality issues and corruption. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check',
          onPress: async () => {
            setIsSaving(true);
            try {
              const result = await dataIntegrityUseCase.execute();
              if (result.success) {
                const report = result.data;
                const message = `Total Runs: ${report.totalRuns}\nValid: ${report.validRuns}\nWith Errors: ${report.runsWithErrors}\nWith Warnings: ${report.runsWithWarnings}\n\n${report.recommendations.join('\n')}`;

                Alert.alert(
                  'Data Integrity Report',
                  message,
                  [
                    { text: 'OK' },
                    ...(report.runsWithErrors > 0 ? [{
                      text: 'Fix Issues',
                      onPress: () => handleAutoFix()
                    }] : [])
                  ]
                );
              } else {
                Alert.alert('Error', 'Failed to check data integrity');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to check data integrity');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleAutoFix = async () => {
    setIsSaving(true);
    try {
      const result = await dataIntegrityUseCase.fixAutomaticIssues();
      if (result.success) {
        const { fixed, errors } = result.data;
        const message = errors.length > 0
          ? `Fixed ${fixed} issues. ${errors.length} issues could not be fixed automatically.`
          : `Successfully fixed ${fixed} data issues.`;

        Alert.alert('Auto-Fix Complete', message);
      } else {
        Alert.alert('Error', 'Failed to fix data issues');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fix data issues');
    } finally {
      setIsSaving(false);
    }
  };

  const getDistanceUnitLabel = (unit: DistanceUnit): string => {
    return unit === 'km' ? 'Kilometers' : 'Miles';
  };

  const getPaceFormatLabel = (format: PaceFormat): string => {
    switch (format) {
      case 'min_per_km': return 'Minutes per KM';
      case 'min_per_mi': return 'Minutes per Mile';
      case 'kph': return 'KM per Hour';
      case 'mph': return 'Miles per Hour';
      default: return format;
    }
  };

  const getGPSAccuracyLabel = (accuracy: GPSAccuracy): string => {
    switch (accuracy) {
      case 'high': return 'High (Best accuracy)';
      case 'balanced': return 'Balanced (Good battery)';
      case 'low': return 'Low (Best battery)';
      default: return accuracy;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>Failed to load settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPreferences}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <SettingSection title="Units & Display">
          <SettingRow
            title="Distance Unit"
            subtitle={getDistanceUnitLabel(preferences.distanceUnit)}
            icon="trail-sign-outline"
            onPress={showDistanceUnitPicker}
            disabled={isSaving}
          />
          <SettingRow
            title="Pace Format"
            subtitle={getPaceFormatLabel(preferences.paceFormat)}
            icon="speedometer-outline"
            onPress={showPaceFormatPicker}
            disabled={isSaving}
          />
        </SettingSection>

        <SettingSection title="GPS & Tracking">
          <SettingRow
            title="GPS Accuracy"
            subtitle={getGPSAccuracyLabel(preferences.gpsAccuracy)}
            icon="location-outline"
            onPress={showGPSAccuracyPicker}
            disabled={isSaving}
          />
          <SettingRow
            title="Auto-Stop"
            subtitle="Automatically pause when you stop"
            icon="pause-circle-outline"
            rightComponent={
              <Switch
                value={preferences.autoStopEnabled}
                onValueChange={(value) => updatePreference('autoStopEnabled', value)}
                disabled={isSaving}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor="#ffffff"
              />
            }
            disabled={isSaving}
          />
        </SettingSection>

        <SettingSection title="App Behavior">
          <SettingRow
            title="Haptic Feedback"
            subtitle="Vibration for button presses"
            icon="phone-portrait-outline"
            rightComponent={
              <Switch
                value={preferences.enableHaptics}
                onValueChange={(value) => updatePreference('enableHaptics', value)}
                disabled={isSaving}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor="#ffffff"
              />
            }
            disabled={isSaving}
          />
          <SettingRow
            title="Sound Effects"
            subtitle="Audio feedback for actions"
            icon="volume-medium-outline"
            rightComponent={
              <Switch
                value={preferences.enableSounds}
                onValueChange={(value) => updatePreference('enableSounds', value)}
                disabled={isSaving}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor="#ffffff"
              />
            }
            disabled={isSaving}
          />
        </SettingSection>

        <SettingSection title="Data & Privacy">
          <SettingRow
            title="Analytics"
            subtitle="Help improve the app"
            icon="analytics-outline"
            rightComponent={
              <Switch
                value={preferences.enableAnalytics}
                onValueChange={(value) => updatePreference('enableAnalytics', value)}
                disabled={isSaving}
                trackColor={{ false: '#767577', true: '#FF6B35' }}
                thumbColor="#ffffff"
              />
            }
            disabled={isSaving}
          />
          <SettingRow
            title="Data Integrity Check"
            subtitle="Validate and fix run data quality"
            icon="shield-checkmark-outline"
            onPress={handleDataIntegrityCheck}
            disabled={isSaving}
          />
        </SettingSection>

        <SettingSection title="Reset">
          <SettingRow
            title="Reset All Settings"
            subtitle="Restore default settings"
            icon="refresh-outline"
            onPress={handleResetSettings}
            disabled={isSaving}
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Personal Running Tracker v{preferences.version}
          </Text>
          <Text style={styles.footerSubtext}>
            All data stays on your device
          </Text>
        </View>
      </ScrollView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.savingText}>Saving...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
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
  section: {
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginHorizontal: 20
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingRowDisabled: {
    opacity: 0.5
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  settingText: {
    marginLeft: 12,
    flex: 1
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666'
  },
  disabledText: {
    color: '#ccc'
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999'
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333'
  }
});