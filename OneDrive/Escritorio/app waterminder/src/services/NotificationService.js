import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.scheduledNotifications = new Set();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Request permissions
      await this.requestPermissions();
      
      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  async requestPermissions() {
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('water-reminders', {
        name: 'Water Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A90E2',
        sound: 'default',
      });
    }

    return true;
  }

  async scheduleWaterReminders(settings) {
    if (!this.isInitialized) await this.initialize();

    const {
      notificationsEnabled,
      notificationStartTime,
      notificationEndTime,
      notificationFrequency
    } = settings;

    if (!notificationsEnabled) {
      await this.cancelAllNotifications();
      return;
    }

    try {
      // Cancel existing notifications
      await this.cancelAllNotifications();

      // Parse times
      const [startHour, startMinute] = notificationStartTime.split(':').map(Number);
      const [endHour, endMinute] = notificationEndTime.split(':').map(Number);

      // Get frequency in minutes
      const frequencyMap = {
        'thirty': 30,
        'sixty': 60,
        'onetwenty': 120,
        'custom': 90, // Default custom value
      };
      const frequencyMinutes = frequencyMap[notificationFrequency] || 60;

      // Calculate notification times for today and next 7 days
      const notificationTimes = this.calculateNotificationTimes(
        startHour,
        startMinute,
        endHour,
        endMinute,
        frequencyMinutes
      );

      // Schedule notifications
      for (const notificationTime of notificationTimes) {
        const notificationId = await this.scheduleNotification(
          'Time to drink water! 💧',
          'Stay hydrated and reach your daily goal.',
          notificationTime
        );
        this.scheduledNotifications.add(notificationId);
      }

      console.log(`Scheduled ${notificationTimes.length} water reminder notifications`);
      return notificationTimes.length;

    } catch (error) {
      console.error('Failed to schedule water reminders:', error);
      throw error;
    }
  }

  calculateNotificationTimes(startHour, startMinute, endHour, endMinute, frequencyMinutes) {
    const times = [];
    const today = new Date();
    
    // Generate notifications for the next 7 days
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + day);
      
      // Set start time
      const startTime = new Date(currentDate);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      // Set end time
      const endTime = new Date(currentDate);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      // Handle case where end time is next day
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      // Generate notification times within the window
      let currentTime = new Date(startTime);
      
      while (currentTime <= endTime) {
        // Only schedule future notifications
        if (currentTime > new Date()) {
          times.push(new Date(currentTime));
        }
        
        // Add frequency interval
        currentTime.setMinutes(currentTime.getMinutes() + frequencyMinutes);
      }
    }

    return times;
  }

  async scheduleNotification(title, body, scheduledTime) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          color: '#4A90E2',
          categoryIdentifier: 'water-reminder',
        },
        trigger: {
          date: scheduledTime,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async scheduleInstantNotification(title, body) {
    if (!this.isInitialized) await this.initialize();

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#4A90E2',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Failed to show instant notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
      console.log('Cancelled all scheduled notifications');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      this.scheduledNotifications.delete(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async getNotificationStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const scheduledNotifications = await this.getScheduledNotifications();
      
      return {
        permissionStatus: status,
        scheduledCount: scheduledNotifications.length,
        isEnabled: status === 'granted',
      };
    } catch (error) {
      console.error('Failed to get notification status:', error);
      return {
        permissionStatus: 'unknown',
        scheduledCount: 0,
        isEnabled: false,
      };
    }
  }

  // Notification event listeners
  addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  removeNotificationSubscription(subscription) {
    if (subscription) {
      subscription.remove();
    }
  }

  // Utility methods
  async testNotification() {
    await this.scheduleInstantNotification(
      'Test Notification',
      'This is a test water reminder notification!'
    );
  }

  getNextNotificationTime(settings) {
    const {
      notificationStartTime,
      notificationEndTime,
      notificationFrequency
    } = settings;

    const frequencyMap = {
      'thirty': 30,
      'sixty': 60,
      'onetwenty': 120,
      'custom': 90,
    };
    const frequencyMinutes = frequencyMap[notificationFrequency] || 60;

    const now = new Date();
    const nextTime = new Date(now.getTime() + frequencyMinutes * 60000);

    // Check if next time is within notification window
    const [startHour, startMinute] = notificationStartTime.split(':').map(Number);
    const [endHour, endMinute] = notificationEndTime.split(':').map(Number);

    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    if (nextTime >= startTime && nextTime <= endTime) {
      return nextTime;
    }

    // If outside window, return next start time
    const nextDay = new Date(startTime);
    if (now > endTime) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  formatNotificationTime(date) {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

// Export singleton instance
export default new NotificationService();