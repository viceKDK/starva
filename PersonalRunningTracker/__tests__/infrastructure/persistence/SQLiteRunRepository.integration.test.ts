import { SQLiteRunRepository } from '../../../src/infrastructure/persistence/SQLiteRunRepository';
import { DatabaseService } from '../../../src/infrastructure/persistence/DatabaseService';
import { Run, GPSPoint } from '../../../src/domain/entities';

// Mock expo-sqlite for integration tests
jest.mock('expo-sqlite', () => {
  let dbData: any = {};
  let migrations: any = {};

  const mockDatabase = {
    execAsync: jest.fn(async (sql: string) => {
      // Simulate SQL execution
      if (sql.includes('CREATE TABLE')) {
        console.log('Creating table:', sql);
      }
      if (sql.includes('PRAGMA')) {
        console.log('Setting pragma:', sql);
      }
    }),
    runAsync: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('INSERT INTO runs')) {
        const id = params[0];
        dbData[id] = {
          id: params[0],
          start_time: params[1],
          end_time: params[2],
          distance: params[3],
          duration: params[4],
          average_pace: params[5],
          route_data: params[6],
          name: params[7],
          notes: params[8],
          created_at: params[9]
        };
        return { changes: 1, insertId: 1 };
      }

      if (sql.includes('INSERT INTO migrations')) {
        migrations[params[0]] = {
          version: params[0],
          applied_at: params[1]
        };
        return { changes: 1, insertId: 1 };
      }

      if (sql.includes('UPDATE runs')) {
        const id = params[params.length - 1];
        if (dbData[id]) {
          // Simulate update
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      if (sql.includes('DELETE FROM runs')) {
        const id = params[0];
        if (dbData[id]) {
          delete dbData[id];
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      return { changes: 0 };
    }),
    getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('SELECT * FROM runs WHERE id')) {
        const id = params[0];
        return dbData[id] || null;
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string, _params: any[] = []) => {
      if (sql.includes('SELECT * FROM runs')) {
        return Object.values(dbData).sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sql.includes('SELECT version FROM migrations')) {
        return Object.values(migrations);
      }
      return [];
    }),
    withTransactionAsync: jest.fn(async (callback: Function) => {
      return await callback();
    }),
    closeAsync: jest.fn()
  };

  return {
    openDatabaseAsync: jest.fn(async () => mockDatabase)
  };
});

describe('SQLiteRunRepository Integration Tests', () => {
  let repository: SQLiteRunRepository;
  let databaseService: DatabaseService;

  const testRun: Run = {
    id: 'integration-test-run-1',
    startTime: new Date('2023-06-01T08:00:00Z'),
    endTime: new Date('2023-06-01T08:30:00Z'),
    duration: 1800,
    distance: 5000,
    averagePace: 360,
    route: [
      {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date('2023-06-01T08:00:00Z'),
        accuracy: 5
      },
      {
        latitude: 40.7138,
        longitude: -74.0050,
        timestamp: new Date('2023-06-01T08:15:00Z'),
        accuracy: 3
      }
    ],
    name: 'Integration Test Run',
    notes: 'Testing database integration',
    createdAt: new Date('2023-06-01T07:30:00Z')
  };

  beforeEach(async () => {
    repository = new SQLiteRunRepository();
    databaseService = DatabaseService.getInstance();

    // Initialize the repository
    await repository.initialize();
  });

  afterEach(async () => {
    // Clean up database connection
    await databaseService.close();
  });

  describe('Full CRUD Operations', () => {
    it('should perform complete CRUD cycle successfully', async () => {
      // CREATE - Save a new run
      const saveResult = await repository.save(testRun);
      expect(saveResult.success).toBe(true);

      // READ - Find by ID
      const findResult = await repository.findById(testRun.id);
      expect(findResult.success).toBe(true);
      expect(findResult.data?.id).toBe(testRun.id);
      expect(findResult.data?.name).toBe(testRun.name);
      expect(findResult.data?.distance).toBe(testRun.distance);

      // READ - Find all (should include our run)
      const findAllResult = await repository.findAll();
      expect(findAllResult.success).toBe(true);
      expect(findAllResult.data?.length).toBeGreaterThan(0);
      const savedRun = findAllResult.data?.find(run => run.id === testRun.id);
      expect(savedRun).toBeDefined();

      // UPDATE - Modify the run
      const updates = {
        name: 'Updated Integration Test Run',
        notes: 'Updated notes after integration test'
      };
      const updateResult = await repository.update(testRun.id, updates);
      expect(updateResult.success).toBe(true);

      // Verify update
      const updatedFindResult = await repository.findById(testRun.id);
      expect(updatedFindResult.success).toBe(true);
      expect(updatedFindResult.data?.name).toBe(updates.name);
      expect(updatedFindResult.data?.notes).toBe(updates.notes);

      // DELETE - Remove the run
      const deleteResult = await repository.delete(testRun.id);
      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const deletedFindResult = await repository.findById(testRun.id);
      expect(deletedFindResult.success).toBe(false);
      expect(deletedFindResult.error).toBe('NOT_FOUND');
    });

    it('should handle multiple runs correctly', async () => {
      const run1 = { ...testRun, id: 'multi-test-1', name: 'Run 1' };
      const run2 = { ...testRun, id: 'multi-test-2', name: 'Run 2' };
      const run3 = { ...testRun, id: 'multi-test-3', name: 'Run 3' };

      // Save multiple runs
      await repository.save(run1);
      await repository.save(run2);
      await repository.save(run3);

      // Retrieve all runs
      const allRunsResult = await repository.findAll();
      expect(allRunsResult.success).toBe(true);
      expect(allRunsResult.data?.length).toBeGreaterThanOrEqual(3);

      // Check that all our runs are present
      const runIds = allRunsResult.data?.map(run => run.id) || [];
      expect(runIds).toContain('multi-test-1');
      expect(runIds).toContain('multi-test-2');
      expect(runIds).toContain('multi-test-3');

      // Clean up
      await repository.delete('multi-test-1');
      await repository.delete('multi-test-2');
      await repository.delete('multi-test-3');
    });

    it('should preserve GPS route data integrity', async () => {
      const complexRoute: GPSPoint[] = [
        {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date('2023-06-01T08:00:00Z'),
          accuracy: 5,
          altitude: 10
        },
        {
          latitude: 40.7138,
          longitude: -74.0050,
          timestamp: new Date('2023-06-01T08:05:00Z'),
          accuracy: 3,
          altitude: 12
        },
        {
          latitude: 40.7148,
          longitude: -74.0040,
          timestamp: new Date('2023-06-01T08:10:00Z'),
          accuracy: 4,
          altitude: 15
        }
      ];

      const runWithComplexRoute = {
        ...testRun,
        id: 'route-test-run',
        route: complexRoute
      };

      // Save run with complex route
      const saveResult = await repository.save(runWithComplexRoute);
      expect(saveResult.success).toBe(true);

      // Retrieve and verify route data
      const findResult = await repository.findById('route-test-run');
      expect(findResult.success).toBe(true);

      const retrievedRoute = findResult.data?.route;
      expect(retrievedRoute).toHaveLength(3);

      // Verify first GPS point
      expect(retrievedRoute![0]!.latitude).toBe(40.7128);
      expect(retrievedRoute![0]!.longitude).toBe(-74.0060);
      expect(retrievedRoute![0]!.accuracy).toBe(5);
      expect(retrievedRoute![0]!.altitude).toBe(10);

      // Verify timestamps are correctly parsed
      expect(retrievedRoute![0]!.timestamp).toBeInstanceOf(Date);
      expect(retrievedRoute![0]!.timestamp.getTime())
        .toBe(new Date('2023-06-01T08:00:00Z').getTime());

      // Clean up
      await repository.delete('route-test-run');
    });
  });

  describe('Performance Testing', () => {
    it('should handle operations within 500ms requirement', async () => {
      const performanceRun = {
        ...testRun,
        id: 'performance-test-run'
      };

      // Test save performance
      const saveStart = Date.now();
      const saveResult = await repository.save(performanceRun);
      const saveTime = Date.now() - saveStart;

      expect(saveResult.success).toBe(true);
      expect(saveTime).toBeLessThan(500);

      // Test findById performance
      const findStart = Date.now();
      const findResult = await repository.findById(performanceRun.id);
      const findTime = Date.now() - findStart;

      expect(findResult.success).toBe(true);
      expect(findTime).toBeLessThan(500);

      // Test update performance
      const updateStart = Date.now();
      const updateResult = await repository.update(performanceRun.id, { name: 'Performance Test Updated' });
      const updateTime = Date.now() - updateStart;

      expect(updateResult.success).toBe(true);
      expect(updateTime).toBeLessThan(500);

      // Test delete performance
      const deleteStart = Date.now();
      const deleteResult = await repository.delete(performanceRun.id);
      const deleteTime = Date.now() - deleteStart;

      expect(deleteResult.success).toBe(true);
      expect(deleteTime).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test finding non-existent run
      const result = await repository.findById('non-existent-run-id');
      expect(result.success).toBe(false);
      expect(result.error).toBe('NOT_FOUND');
    });

    it('should handle update of non-existent run', async () => {
      const result = await repository.update('non-existent-id', { name: 'Test' });
      expect(result.success).toBe(false);
    });

    it('should handle delete of non-existent run', async () => {
      const result = await repository.delete('non-existent-id');
      expect(result.success).toBe(false);
    });
  });
});