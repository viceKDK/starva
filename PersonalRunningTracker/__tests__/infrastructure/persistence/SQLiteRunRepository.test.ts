import { SQLiteRunRepository } from '../../../src/infrastructure/persistence/SQLiteRunRepository';
import { DatabaseService } from '../../../src/infrastructure/persistence/DatabaseService';
import { MigrationService } from '../../../src/infrastructure/persistence/MigrationService';
import { Run } from '../../../src/domain/entities';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn()
}));

// Mock DatabaseService and MigrationService
jest.mock('../../../src/infrastructure/persistence/DatabaseService');
jest.mock('../../../src/infrastructure/persistence/MigrationService');

describe('SQLiteRunRepository', () => {
  let repository: SQLiteRunRepository;
  let mockDatabase: any;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockMigrationService: jest.Mocked<MigrationService>;

  const mockRun: Run = {
    id: 'test-run-1',
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: new Date('2023-01-01T10:30:00Z'),
    duration: 1800, // 30 minutes
    distance: 5000, // 5km
    averagePace: 360, // 6 minutes per km
    route: [
      {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date('2023-01-01T10:00:00Z'),
        accuracy: 5
      },
      {
        latitude: 40.7138,
        longitude: -74.0050,
        timestamp: new Date('2023-01-01T10:15:00Z'),
        accuracy: 3
      }
    ],
    name: 'Morning Run',
    notes: 'Great weather!',
    createdAt: new Date('2023-01-01T09:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDatabase = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn(),
      execAsync: jest.fn(),
      withTransactionAsync: jest.fn(),
      closeAsync: jest.fn()
    };

    mockDatabaseService = {
      getInstance: jest.fn().mockReturnThis(),
      initialize: jest.fn(),
      getConnection: jest.fn(),
      close: jest.fn(),
      executeTransaction: jest.fn()
    } as any;

    mockMigrationService = {
      runMigrations: jest.fn(),
      rollbackMigration: jest.fn(),
      getAppliedMigrations: jest.fn()
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabaseService);

    repository = new SQLiteRunRepository();
  });

  describe('initialize', () => {
    it('should initialize database and run migrations successfully', async () => {
      mockDatabaseService.initialize.mockResolvedValue({
        success: true,
        data: { database: mockDatabase, isConnected: true }
      });
      mockMigrationService.runMigrations.mockResolvedValue({ success: true });

      const result = await repository.initialize();

      expect(result.success).toBe(true);
      expect(mockDatabaseService.initialize).toHaveBeenCalled();
      expect(mockMigrationService.runMigrations).toHaveBeenCalled();
    });

    it('should return error if database initialization fails', async () => {
      mockDatabaseService.initialize.mockResolvedValue({
        success: false,
        error: 'CONNECTION_FAILED'
      });

      const result = await repository.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONNECTION_FAILED');
      expect(mockMigrationService.runMigrations).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    beforeEach(() => {
      mockDatabaseService.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockDatabase);
          return { success: true };
        } catch (error) {
          return { success: false, error: 'SAVE_FAILED' };
        }
      });
    });

    it('should save a valid run successfully', async () => {
      const result = await repository.save(mockRun);

      expect(result.success).toBe(true);
      expect(mockDatabaseService.executeTransaction).toHaveBeenCalled();
    });

    it('should reject run with invalid id', async () => {
      const invalidRun = { ...mockRun, id: '' };

      const result = await repository.save(invalidRun);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    it('should reject run with invalid distance', async () => {
      const invalidRun = { ...mockRun, distance: -100 };

      const result = await repository.save(invalidRun);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    it('should reject run with invalid duration', async () => {
      const invalidRun = { ...mockRun, duration: 0 };

      const result = await repository.save(invalidRun);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    it('should reject run with invalid GPS coordinates', async () => {
      const invalidRun = {
        ...mockRun,
        route: [
          {
            latitude: 200, // Invalid latitude
            longitude: -74.0060,
            timestamp: new Date(),
            accuracy: 5
          }
        ]
      };

      const result = await repository.save(invalidRun);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    it('should reject run with start time after end time', async () => {
      const invalidRun = {
        ...mockRun,
        startTime: new Date('2023-01-01T11:00:00Z'),
        endTime: new Date('2023-01-01T10:00:00Z')
      };

      const result = await repository.save(invalidRun);

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      mockDatabaseService.initialize.mockResolvedValue({
        success: true,
        data: { database: mockDatabase, isConnected: true }
      });
    });

    it('should find run by id successfully', async () => {
      const mockRow = {
        id: mockRun.id,
        start_time: mockRun.startTime.toISOString(),
        end_time: mockRun.endTime.toISOString(),
        distance: mockRun.distance,
        duration: mockRun.duration,
        average_pace: mockRun.averagePace,
        route_data: JSON.stringify(mockRun.route),
        name: mockRun.name,
        notes: mockRun.notes,
        created_at: mockRun.createdAt.toISOString()
      };

      mockDatabase.getFirstAsync.mockResolvedValue(mockRow);

      const result = await repository.findById(mockRun.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mockRun.id);
      expect(result.data?.name).toBe(mockRun.name);
    });

    it('should return NOT_FOUND when run does not exist', async () => {
      mockDatabase.getFirstAsync.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('NOT_FOUND');
    });

    it('should handle database query errors', async () => {
      mockDatabase.getFirstAsync.mockRejectedValue(new Error('Database error'));

      const result = await repository.findById(mockRun.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('QUERY_FAILED');
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      mockDatabaseService.initialize.mockResolvedValue({
        success: true,
        data: { database: mockDatabase, isConnected: true }
      });
    });

    it('should return all runs successfully', async () => {
      const mockRows = [
        {
          id: 'run-1',
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T10:30:00Z',
          distance: 5000,
          duration: 1800,
          average_pace: 360,
          route_data: JSON.stringify([]),
          name: 'Run 1',
          notes: '',
          created_at: '2023-01-01T09:00:00Z'
        },
        {
          id: 'run-2',
          start_time: '2023-01-02T10:00:00Z',
          end_time: '2023-01-02T10:45:00Z',
          distance: 7500,
          duration: 2700,
          average_pace: 360,
          route_data: JSON.stringify([]),
          name: 'Run 2',
          notes: '',
          created_at: '2023-01-02T09:00:00Z'
        }
      ];

      mockDatabase.getAllAsync.mockResolvedValue(mockRows);

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]!.id).toBe('run-1');
      expect(result.data![1]!.id).toBe('run-2');
    });

    it('should return empty array when no runs exist', async () => {
      mockDatabase.getAllAsync.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockDatabaseService.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockDatabase);
          return { success: true };
        } catch (error) {
          return { success: false, error: 'DELETE_FAILED' };
        }
      });
    });

    it('should delete run successfully', async () => {
      mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

      const result = await repository.delete(mockRun.id);

      expect(result.success).toBe(true);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'DELETE FROM runs WHERE id = ?',
        [mockRun.id]
      );
    });

    it('should handle case when run to delete does not exist', async () => {
      mockDatabase.runAsync.mockResolvedValue({ changes: 0 });

      const result = await repository.delete('non-existent-id');

      expect(result.success).toBe(false);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockDatabaseService.executeTransaction.mockImplementation(async (callback) => {
        try {
          await callback(mockDatabase);
          return { success: true };
        } catch (error) {
          return { success: false, error: 'QUERY_FAILED' };
        }
      });
    });

    it('should update run name successfully', async () => {
      mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

      const updates = { name: 'Updated Run Name' };
      const result = await repository.update(mockRun.id, updates);

      expect(result.success).toBe(true);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE runs SET name = ? WHERE id = ?',
        ['Updated Run Name', mockRun.id]
      );
    });

    it('should update multiple fields successfully', async () => {
      mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

      const updates = {
        name: 'Updated Run',
        notes: 'Updated notes',
        distance: 6000
      };
      const result = await repository.update(mockRun.id, updates);

      expect(result.success).toBe(true);
      expect(mockDatabase.runAsync).toHaveBeenCalledWith(
        'UPDATE runs SET name = ?, notes = ?, distance = ? WHERE id = ?',
        ['Updated Run', 'Updated notes', 6000, mockRun.id]
      );
    });

    it('should reject empty updates', async () => {
      const result = await repository.update(mockRun.id, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    it('should handle case when run to update does not exist', async () => {
      mockDatabase.runAsync.mockResolvedValue({ changes: 0 });

      const result = await repository.update('non-existent-id', { name: 'Test' });

      expect(result.success).toBe(false);
    });
  });
});