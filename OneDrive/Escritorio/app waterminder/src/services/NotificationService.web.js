// Web fallback for notifications - uses browser notifications
class WebNotificationService {
  constructor() {
    this.isInitialized = false;
    this.scheduledNotifications = new Set();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if ('Notification' in window) {
        await this.requestPermissions();
      }
      this.isInitialized = true;
      console.log('Web NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize web notifications:', error);
    }
  }

  async requestPermissions() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission === 'granted';
  }

  async scheduleWaterReminders(settings) {
    if (!this.isInitialized) await this.initialize();

    const { notificationsEnabled } = settings;

    if (!notificationsEnabled) {
      this.cancelAllNotifications();
      return 0;
    }

    // Web browsers don't support scheduled notifications the same way
    // We'll just show a simple reminder setup message
    if (Notification.permission === 'granted') {
      console.log('Water reminders configured for web');
      return 1;
    }

    return 0;
  }

  async scheduleInstantNotification(title, body) {
    if (!this.isInitialized) await this.initialize();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/assets/icon.png',
        badge: '/assets/icon.png'
      });
    } else {
      console.log('Notification:', title, body);
    }
  }

  async cancelAllNotifications() {
    this.scheduledNotifications.clear();
    console.log('Web notifications cleared');
  }

  async getNotificationStatus() {
    const isSupported = 'Notification' in window;
    const permission = isSupported ? Notification.permission : 'denied';
    
    return {
      permissionStatus: permission,
      scheduledCount: 0,
      isEnabled: permission === 'granted',
      isSupported
    };
  }

  async testNotification() {
    await this.scheduleInstantNotification(
      'Test Notification',
      'This is a test water reminder notification!'
    );
  }

  // Stub methods for compatibility
  addNotificationResponseListener(callback) {
    return { remove: () => {} };
  }

  addNotificationReceivedListener(callback) {
    return { remove: () => {} };
  }

  removeNotificationSubscription(subscription) {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  }

  getNextNotificationTime(settings) {
    return new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  }

  formatNotificationTime(date) {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

export default new WebNotificationService();