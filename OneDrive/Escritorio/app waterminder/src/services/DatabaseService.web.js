// Web fallback for SQLite - uses localStorage
class WebDatabaseService {
  constructor() {
    this.isInitialized = false;
    this.storageKeys = {
      waterIntake: 'waterIntake',
      containers: 'containers', 
      settings: 'settings'
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize with default data if not exists
      if (!localStorage.getItem(this.storageKeys.containers)) {
        await this.seedDefaultData();
      }
      this.isInitialized = true;
      console.log('Web Database Service initialized with localStorage');
    } catch (error) {
      console.error('Failed to initialize web database:', error);
      throw error;
    }
  }

  async seedDefaultData() {
    const defaultContainers = [
      { id: 1, name: 'Glass', volume: 250, color: '#4A90E2', type: 'wine-glass-outline' },
      { id: 2, name: 'Bottle', volume: 500, color: '#50C878', type: 'water-outline' },
      { id: 3, name: 'Large Bottle', volume: 1000, color: '#FF6B6B', type: 'flask-outline' }
    ];

    const defaultSettings = {
      dailyGoal: 2000,
      notificationsEnabled: true,
      notificationStartTime: '08:00',
      notificationEndTime: '22:00',
      notificationFrequency: 'sixty',
      unit: 'ml'
    };

    localStorage.setItem(this.storageKeys.containers, JSON.stringify(defaultContainers));
    localStorage.setItem(this.storageKeys.settings, JSON.stringify(defaultSettings));
    localStorage.setItem(this.storageKeys.waterIntake, JSON.stringify([]));
  }

  async logWaterIntake(amount, containerId = null) {
    const intake = JSON.parse(localStorage.getItem(this.storageKeys.waterIntake) || '[]');
    const newEntry = {
      id: Date.now(),
      amount: amount,
      containerId: containerId,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    };
    
    intake.push(newEntry);
    localStorage.setItem(this.storageKeys.waterIntake, JSON.stringify(intake));
    return newEntry;
  }

  async getTodayWaterIntake() {
    const today = new Date().toISOString().split('T')[0];
    const intake = JSON.parse(localStorage.getItem(this.storageKeys.waterIntake) || '[]');
    return intake.filter(entry => entry.date === today);
  }

  async getWaterIntakeByDateRange(startDate, endDate) {
    const intake = JSON.parse(localStorage.getItem(this.storageKeys.waterIntake) || '[]');
    return intake.filter(entry => {
      const entryDate = entry.date;
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  async getContainers() {
    return JSON.parse(localStorage.getItem(this.storageKeys.containers) || '[]');
  }

  async addContainer(container) {
    const containers = await this.getContainers();
    const newContainer = {
      ...container,
      id: Date.now()
    };
    containers.push(newContainer);
    localStorage.setItem(this.storageKeys.containers, JSON.stringify(containers));
    return newContainer;
  }

  async updateContainer(containerId, updates) {
    const containers = await this.getContainers();
    const index = containers.findIndex(c => c.id === containerId);
    if (index >= 0) {
      containers[index] = { ...containers[index], ...updates };
      localStorage.setItem(this.storageKeys.containers, JSON.stringify(containers));
      return containers[index];
    }
    throw new Error('Container not found');
  }

  async deleteContainer(containerId) {
    const containers = await this.getContainers();
    const filteredContainers = containers.filter(c => c.id !== containerId);
    localStorage.setItem(this.storageKeys.containers, JSON.stringify(filteredContainers));
  }

  async getSettings() {
    const defaultSettings = {
      dailyGoal: 2000,
      notificationsEnabled: true,
      notificationStartTime: '08:00',
      notificationEndTime: '22:00',
      notificationFrequency: 'sixty',
      unit: 'ml'
    };
    
    const stored = localStorage.getItem(this.storageKeys.settings);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  }

  async updateSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.storageKeys.settings, JSON.stringify(updated));
    return updated;
  }

  async getStatistics(period = 'daily', date = null) {
    const targetDate = date ? new Date(date) : new Date();
    let startDate, endDate;

    if (period === 'daily') {
      startDate = endDate = targetDate.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
      startDate = startOfWeek.toISOString().split('T')[0];
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endDate = endOfWeek.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    const intake = await this.getWaterIntakeByDateRange(startDate, endDate);
    const totalAmount = intake.reduce((sum, entry) => sum + entry.amount, 0);
    const entries = intake.length;

    return {
      totalAmount,
      entries,
      averagePerDay: period === 'daily' ? totalAmount : Math.round(totalAmount / this.getDaysBetween(startDate, endDate)),
      period,
      startDate,
      endDate
    };
  }

  getDaysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}

export default new WebDatabaseService();