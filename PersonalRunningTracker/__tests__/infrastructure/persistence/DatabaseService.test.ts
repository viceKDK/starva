import { DatabaseService } from '../../../src/infrastructure/persistence/DatabaseService';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn()
}));

describe('DatabaseService', () => {
  let databaseService: DatabaseService;
  let mockDatabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDatabase = {
      execAsync: jest.fn(),
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
      closeAsync: jest.fn()
    };

    // Reset singleton instance
    (DatabaseService as any).instance = undefined;
    databaseService = DatabaseService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);

      const result = await databaseService.initialize();

      expect(result.success).toBe(true);
      expect(result.data?.database).toBe(mockDatabase);
      expect(result.data?.isConnected).toBe(true);
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('running_tracker.db');
      expect(mockDatabase.execAsync).toHaveBeenCalledWith(expect.stringContaining('PRAGMA'));
    });

    it('should return existing connection if already initialized', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);

      // First initialization
      const result1 = await databaseService.initialize();
      expect(result1.success).toBe(true);

      // Second call should return existing connection
      const result2 = await databaseService.initialize();
      expect(result2.success).toBe(true);
      expect(result2.data).toBe(result1.data);
      expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
    });

    it('should handle database initialization failure', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(null);

      const result = await databaseService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONNECTION_FAILED');
    });

    it('should handle database initialization error', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await databaseService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONNECTION_FAILED');
    });
  });

  describe('close', () => {
    it('should close database connection successfully', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
      await databaseService.initialize();

      const result = await databaseService.close();

      expect(result.success).toBe(true);
      expect(mockDatabase.closeAsync).toHaveBeenCalled();
      expect(databaseService.getConnection()).toBeNull();
    });

    it('should handle close when no connection exists', async () => {
      const result = await databaseService.close();

      expect(result.success).toBe(true);
      expect(mockDatabase.closeAsync).not.toHaveBeenCalled();
    });

    it('should handle close error', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
      mockDatabase.closeAsync.mockRejectedValue(new Error('Close error'));
      await databaseService.initialize();

      const result = await databaseService.close();

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONNECTION_FAILED');
    });
  });

  describe('executeTransaction', () => {
    beforeEach(async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
      await databaseService.initialize();
    });

    it('should execute transaction successfully', async () => {
      const mockResult = { id: 'test-id' };
      mockDatabase.withTransactionAsync.mockImplementation(async (callback: Function) => {
        return await callback();
      });

      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      const result = await databaseService.executeTransaction(mockOperation);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockResult);
      expect(mockDatabase.withTransactionAsync).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(mockDatabase);
    });

    it('should handle transaction failure', async () => {
      mockDatabase.withTransactionAsync.mockRejectedValue(new Error('Transaction error'));

      const mockOperation = jest.fn();

      const result = await databaseService.executeTransaction(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QUERY_FAILED');
    });

    it('should return error when no connection exists', async () => {
      await databaseService.close();

      const mockOperation = jest.fn();

      const result = await databaseService.executeTransaction(mockOperation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONNECTION_FAILED');
      expect(mockOperation).not.toHaveBeenCalled();
    });
  });

  describe('getConnection', () => {
    it('should return null when not initialized', () => {
      const connection = databaseService.getConnection();
      expect(connection).toBeNull();
    });

    it('should return connection when initialized', async () => {
      (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
      await databaseService.initialize();

      const connection = databaseService.getConnection();
      expect(connection).toBeDefined();
      expect(connection?.database).toBe(mockDatabase);
      expect(connection?.isConnected).toBe(true);
    });
  });
});