import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('waterminder.db');
      await this.createTables();
      await this.seedDefaultData();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async createTables() {
    const createTablesSQL = `
      -- Water intake logging table
      CREATE TABLE IF NOT EXISTS water_intake (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER NOT NULL,
        container_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        date TEXT NOT NULL
      );

      -- Container templates table
      CREATE TABLE IF NOT EXISTS containers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        volume INTEGER NOT NULL,
        type TEXT NOT NULL,
        color TEXT NOT NULL,
        is_custom BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Settings storage table
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Daily goals table
      CREATE TABLE IF NOT EXISTS daily_goals (
        date TEXT PRIMARY KEY,
        goal_amount INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_water_intake_date ON water_intake(date);
      CREATE INDEX IF NOT EXISTS idx_water_intake_timestamp ON water_intake(timestamp);
      CREATE INDEX IF NOT EXISTS idx_containers_active ON containers(is_active);
    `;

    await this.db.execAsync(createTablesSQL);
  }

  async seedDefaultData() {
    // Check if default containers already exist
    const existingContainers = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM containers WHERE is_custom = 0'
    );

    if (existingContainers.count === 0) {
      const defaultContainers = [
        { id: 'glass-250', name: 'Glass', volume: 250, type: 'wine-outline', color: '#4A90E2' },
        { id: 'bottle-500', name: 'Bottle', volume: 500, type: 'bottle-outline', color: '#87CEEB' },
        { id: 'large-1000', name: 'Large Bottle', volume: 1000, type: 'flask-outline', color: '#4CAF50' },
      ];

      for (const container of defaultContainers) {
        await this.db.runAsync(
          'INSERT INTO containers (id, name, volume, type, color, is_custom, is_active) VALUES (?, ?, ?, ?, ?, 0, 1)',
          [container.id, container.name, container.volume, container.type, container.color]
        );
      }
    }

    // Set default daily goal if not exists
    const defaultGoal = await this.getSetting('daily_goal');
    if (!defaultGoal) {
      await this.setSetting('daily_goal', '2000');
    }

    // Set default notification settings
    const notificationsEnabled = await this.getSetting('notifications_enabled');
    if (notificationsEnabled === null) {
      await this.setSetting('notifications_enabled', 'true');
      await this.setSetting('notification_start_time', '08:00');
      await this.setSetting('notification_end_time', '22:00');
      await this.setSetting('notification_frequency', 'sixty');
    }
  }

  // Water Intake Methods
  async logWaterIntake(amount, containerId = null) {
    if (!this.isInitialized) await this.initialize();

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const timestamp = new Date().toISOString();

    try {
      const result = await this.db.runAsync(
        'INSERT INTO water_intake (amount, container_id, timestamp, date) VALUES (?, ?, ?, ?)',
        [amount, containerId, timestamp, date]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Failed to log water intake:', error);
      throw error;
    }
  }

  async getDailyIntake(date = null) {
    if (!this.isInitialized) await this.initialize();

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const result = await this.db.getFirstAsync(
        'SELECT COALESCE(SUM(amount), 0) as total FROM water_intake WHERE date = ?',
        [targetDate]
      );
      return result.total;
    } catch (error) {
      console.error('Failed to get daily intake:', error);
      return 0;
    }
  }

  async getWeeklyIntake(startDate, endDate) {
    if (!this.isInitialized) await this.initialize();

    try {
      const results = await this.db.getAllAsync(`
        SELECT 
          date,
          COALESCE(SUM(amount), 0) as consumed,
          strftime('%w', date) as day_of_week
        FROM water_intake 
        WHERE date BETWEEN ? AND ? 
        GROUP BY date 
        ORDER BY date
      `, [startDate, endDate]);

      return results;
    } catch (error) {
      console.error('Failed to get weekly intake:', error);
      return [];
    }
  }

  async getMonthlyIntake(year, month) {
    if (!this.isInitialized) await this.initialize();

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    try {
      const results = await this.db.getAllAsync(`
        SELECT 
          date,
          COALESCE(SUM(amount), 0) as consumed,
          CAST(strftime('%d', date) as INTEGER) as day
        FROM water_intake 
        WHERE date BETWEEN ? AND ? 
        GROUP BY date 
        ORDER BY date
      `, [startDate, endDate]);

      return results;
    } catch (error) {
      console.error('Failed to get monthly intake:', error);
      return [];
    }
  }

  async getHourlyIntake(date = null) {
    if (!this.isInitialized) await this.initialize();

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const results = await this.db.getAllAsync(`
        SELECT 
          CAST(strftime('%H', timestamp) as INTEGER) as hour,
          COALESCE(SUM(amount), 0) as amount
        FROM water_intake 
        WHERE date = ? 
        GROUP BY strftime('%H', timestamp)
        ORDER BY hour
      `, [targetDate]);

      // Fill in missing hours with 0
      const hourlyData = new Array(24).fill(0);
      results.forEach(row => {
        hourlyData[row.hour] = row.amount;
      });

      return hourlyData;
    } catch (error) {
      console.error('Failed to get hourly intake:', error);
      return new Array(24).fill(0);
    }
  }

  // Container Methods
  async createContainer(name, volume, type, color, isCustom = true) {
    if (!this.isInitialized) await this.initialize();

    const id = `${isCustom ? 'custom' : 'default'}-${Date.now()}`;

    try {
      await this.db.runAsync(
        'INSERT INTO containers (id, name, volume, type, color, is_custom, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [id, name, volume, type, color, isCustom ? 1 : 0]
      );
      return id;
    } catch (error) {
      console.error('Failed to create container:', error);
      throw error;
    }
  }

  async updateContainer(id, updates) {
    if (!this.isInitialized) await this.initialize();

    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (['name', 'volume', 'type', 'color'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);

    try {
      await this.db.runAsync(
        `UPDATE containers SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return true;
    } catch (error) {
      console.error('Failed to update container:', error);
      throw error;
    }
  }

  async deleteContainer(id) {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.db.runAsync('UPDATE containers SET is_active = 0 WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Failed to delete container:', error);
      throw error;
    }
  }

  async getAllContainers() {
    if (!this.isInitialized) await this.initialize();

    try {
      const containers = await this.db.getAllAsync(
        'SELECT * FROM containers WHERE is_active = 1 ORDER BY is_custom ASC, name ASC'
      );

      return containers.map(container => ({
        id: container.id,
        name: container.name,
        volume: container.volume,
        type: container.type,
        color: container.color,
        isCustom: Boolean(container.is_custom),
      }));
    } catch (error) {
      console.error('Failed to get containers:', error);
      return [];
    }
  }

  async getDefaultContainers() {
    if (!this.isInitialized) await this.initialize();

    try {
      const containers = await this.db.getAllAsync(
        'SELECT * FROM containers WHERE is_custom = 0 AND is_active = 1 ORDER BY name ASC'
      );

      return containers.map(container => ({
        id: container.id,
        name: container.name,
        volume: container.volume,
        type: container.type,
        color: container.color,
        isCustom: false,
      }));
    } catch (error) {
      console.error('Failed to get default containers:', error);
      return [];
    }
  }

  // Settings Methods
  async setSetting(key, value) {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [key, JSON.stringify(value)]);
      return true;
    } catch (error) {
      console.error('Failed to set setting:', error);
      throw error;
    }
  }

  async getSetting(key, defaultValue = null) {
    if (!this.isInitialized) await this.initialize();

    try {
      const result = await this.db.getFirstAsync(
        'SELECT value FROM settings WHERE key = ?',
        [key]
      );

      if (result) {
        return JSON.parse(result.value);
      }
      return defaultValue;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  }

  async getDailyGoal(date = null) {
    if (!this.isInitialized) await this.initialize();

    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const result = await this.db.getFirstAsync(
        'SELECT goal_amount FROM daily_goals WHERE date = ?',
        [targetDate]
      );

      if (result) {
        return result.goal_amount;
      }

      // Fallback to default setting
      const defaultGoal = await this.getSetting('daily_goal', 2000);
      return parseInt(defaultGoal);
    } catch (error) {
      console.error('Failed to get daily goal:', error);
      return 2000;
    }
  }

  async setDailyGoal(date, amount) {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.db.runAsync(`
        INSERT OR REPLACE INTO daily_goals (date, goal_amount, created_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [date, amount]);
      return true;
    } catch (error) {
      console.error('Failed to set daily goal:', error);
      throw error;
    }
  }

  // Statistics Methods
  async getStreakDays() {
    if (!this.isInitialized) await this.initialize();

    try {
      const defaultGoal = await this.getSetting('daily_goal', 2000);
      
      const results = await this.db.getAllAsync(`
        SELECT 
          date,
          COALESCE(SUM(amount), 0) as total
        FROM water_intake 
        WHERE date >= date('now', '-30 days')
        GROUP BY date 
        HAVING total >= ?
        ORDER BY date DESC
      `, [defaultGoal]);

      // Calculate consecutive days from today backwards
      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      let currentDate = new Date(today);

      for (let i = 0; i < 30; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = results.find(r => r.date === dateStr);
        
        if (dayData && dayData.total >= defaultGoal) {
          streak++;
        } else {
          break;
        }

        currentDate.setDate(currentDate.getDate() - 1);
      }

      return streak;
    } catch (error) {
      console.error('Failed to calculate streak:', error);
      return 0;
    }
  }

  async getBestDay(period = 'month') {
    if (!this.isInitialized) await this.initialize();

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "WHERE date >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "WHERE date >= date('now', '-30 days')";
        break;
      case 'year':
        dateFilter = "WHERE date >= date('now', '-365 days')";
        break;
      default:
        dateFilter = "WHERE date >= date('now', '-30 days')";
    }

    try {
      const result = await this.db.getFirstAsync(`
        SELECT 
          date,
          COALESCE(SUM(amount), 0) as total
        FROM water_intake 
        ${dateFilter}
        GROUP BY date 
        ORDER BY total DESC 
        LIMIT 1
      `);

      return result || { date: null, total: 0 };
    } catch (error) {
      console.error('Failed to get best day:', error);
      return { date: null, total: 0 };
    }
  }

  async getAverageIntake(period = 'month') {
    if (!this.isInitialized) await this.initialize();

    let dateFilter = '';
    switch (period) {
      case 'week':
        dateFilter = "WHERE date >= date('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "WHERE date >= date('now', '-30 days')";
        break;
      case 'year':
        dateFilter = "WHERE date >= date('now', '-365 days')";
        break;
      default:
        dateFilter = "WHERE date >= date('now', '-30 days')";
    }

    try {
      const result = await this.db.getFirstAsync(`
        SELECT 
          AVG(daily_total) as average
        FROM (
          SELECT 
            date,
            COALESCE(SUM(amount), 0) as daily_total
          FROM water_intake 
          ${dateFilter}
          GROUP BY date
        )
      `);

      return Math.round(result?.average || 0);
    } catch (error) {
      console.error('Failed to get average intake:', error);
      return 0;
    }
  }

  // Utility Methods
  async resetAllData() {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.db.execAsync(`
        DELETE FROM water_intake;
        DELETE FROM containers WHERE is_custom = 1;
        DELETE FROM settings;
        DELETE FROM daily_goals;
      `);

      await this.seedDefaultData();
      return true;
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw error;
    }
  }

  async closeDatabase() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export default new DatabaseService();