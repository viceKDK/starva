import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';

// Import screens
import HomeScreen from '../components/HomeScreen';
import StatsScreen from '../components/StatsScreen';
import SettingsScreen from '../components/SettingsScreen';

const Tab = createBottomTabNavigator();

const AppNavigator = () => {
  const getTabBarIcon = (routeName, focused, color, size) => {
    let iconName;

    switch (routeName) {
      case 'Home':
        iconName = focused ? 'water' : 'water-outline';
        break;
      case 'Stats':
        iconName = focused ? 'analytics' : 'analytics-outline';
        break;
      case 'Settings':
        iconName = focused ? 'settings' : 'settings-outline';
        break;
      default:
        iconName = 'circle-outline';
    }

    return <Ionicons name={iconName} size={size} color={color} />;
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) =>
            getTabBarIcon(route.name, focused, color, size),
          tabBarActiveTintColor: '#4A90E2',
          tabBarInactiveTintColor: '#999999',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            paddingBottom: Platform.OS === 'ios' ? 0 : 5,
          },
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E8F4F8',
            height: Platform.OS === 'ios' ? 88 : 65,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 25 : 8,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          headerShown: false, // We'll handle headers in individual screens
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarAccessibilityLabel: 'Home Tab, Water Logging',
          }}
        />
        <Tab.Screen
          name="Stats"
          component={StatsScreen}
          options={{
            tabBarLabel: 'Statistics',
            tabBarAccessibilityLabel: 'Statistics Tab, View Water Intake Data',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarAccessibilityLabel: 'Settings Tab, App Configuration',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;