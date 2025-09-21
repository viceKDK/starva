import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList, RootTabParamList } from '@/shared/types';
import { TrackingScreen, HistoryScreen, RunCompletionScreen, RunDetailsScreen, PersonalRecordsScreen, AchievementsScreen, SettingsScreen } from '../screens';
import { SessionRecoveryDialog } from '../components/session';
import { useSessionRecovery } from '../hooks/useSessionRecovery';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Tracking') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'PersonalRecords') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = focused ? 'list' : 'list-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#FF6B35',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Tracking"
        component={TrackingScreen}
        options={{ title: 'Track Run' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Run History' }}
      />
      <Tab.Screen
        name="PersonalRecords"
        component={PersonalRecordsScreen}
        options={{ title: 'Personal Records' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const {
    isRecoveryDialogVisible,
    pendingSession,
    handleContinueSession,
    handleSaveSession,
    handleDiscardSession
  } = useSessionRecovery();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FF6B35',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
      <Stack.Screen
        name="RunCompletion"
        component={RunCompletionScreen}
        options={{
            title: 'Run Summary'
        }}
      />
      <Stack.Screen
        name="RunDetail"
        component={RunDetailsScreen}
        options={{
            title: 'Run Details'
        }}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
            title: 'Achievements'
        }}
      />
      </Stack.Navigator>

      {/* Session Recovery Dialog */}
      <SessionRecoveryDialog
        visible={isRecoveryDialogVisible}
        sessionData={pendingSession}
        onContinue={handleContinueSession}
        onSave={handleSaveSession}
        onDiscard={handleDiscardSession}
      />
    </NavigationContainer>
  );
};
