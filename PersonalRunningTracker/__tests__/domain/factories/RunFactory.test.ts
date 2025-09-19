import { RunFactory } from '@/domain/factories/RunFactory';
import { GPSPoint } from '@/domain/entities';

describe('RunFactory', () => {
  const mockGPSPoints: GPSPoint[] = [
    {
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: new Date('2024-01-01T10:00:00Z'),
      accuracy: 5,
      altitude: 10
    },
    {
      latitude: 40.7138,
      longitude: -74.0070,
      timestamp: new Date('2024-01-01T10:05:00Z'),
      accuracy: 4,
      altitude: 12
    },
    {
      latitude: 40.7148,
      longitude: -74.0080,
      timestamp: new Date('2024-01-01T10:10:00Z'),
      accuracy: 6,
      altitude: 8
    }
  ];

  describe('create', () => {
    it('should create a run with provided options', () => {
      const options = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:30:00Z'),
        route: mockGPSPoints,
        name: 'Morning Run',
        notes: 'Great weather today'
      };

      const run = RunFactory.create(options);

      expect(run.name).toBe('Morning Run');
      expect(run.notes).toBe('Great weather today');
      expect(run.startTime).toEqual(options.startTime);
      expect(run.endTime).toEqual(options.endTime);
      expect(run.route).toEqual(mockGPSPoints);
      expect(run.duration).toBe(1800); // 30 minutes
      expect(run.distance).toBeGreaterThan(0);
      expect(run.averagePace).toBeGreaterThan(0);
    });

    it('should generate default name when not provided', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const options = {
        startTime,
        endTime: new Date('2024-01-01T10:30:00Z'),
        route: mockGPSPoints
      };

      const run = RunFactory.create(options);

      expect(run.name).toContain('10:00');
      expect(run.name).toContain('Jan 1');
    });

    it('should calculate distance correctly', () => {
      const options = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:30:00Z'),
        route: mockGPSPoints
      };

      const run = RunFactory.create(options);

      expect(run.distance).toBeGreaterThan(0);
      expect(typeof run.distance).toBe('number');
      expect(isFinite(run.distance)).toBe(true);
    });

    it('should calculate average pace correctly', () => {
      const options = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:30:00Z'),
        route: mockGPSPoints
      };

      const run = RunFactory.create(options);

      expect(run.averagePace).toBeGreaterThan(0);
      expect(typeof run.averagePace).toBe('number');
      expect(isFinite(run.averagePace)).toBe(true);
    });
  });

  describe('createFromTracking', () => {
    it('should create run from GPS tracking data', () => {
      const options = {
        route: mockGPSPoints,
        name: 'Tracked Run',
        notes: 'Auto-generated from tracking'
      };

      const run = RunFactory.createFromTracking(options);

      expect(run.name).toBe('Tracked Run');
      expect(run.notes).toBe('Auto-generated from tracking');
      expect(run.startTime).toEqual(mockGPSPoints[0].timestamp);
      expect(run.endTime).toEqual(mockGPSPoints[mockGPSPoints.length - 1].timestamp);
      expect(run.route).toEqual(mockGPSPoints);
    });

    it('should sort GPS points by timestamp', () => {
      const unsortedPoints = [mockGPSPoints[2], mockGPSPoints[0], mockGPSPoints[1]];
      const options = {
        route: unsortedPoints,
        name: 'Unsorted Run'
      };

      const run = RunFactory.createFromTracking(options);

      expect(run.route[0].timestamp.getTime()).toBeLessThan(run.route[1].timestamp.getTime());
      expect(run.route[1].timestamp.getTime()).toBeLessThan(run.route[2].timestamp.getTime());
    });

    it('should throw error for insufficient GPS points', () => {
      const options = {
        route: [mockGPSPoints[0]], // Only one point
        name: 'Invalid Run'
      };

      expect(() => RunFactory.createFromTracking(options)).toThrow('Route must contain at least 2 GPS points');
    });
  });

  describe('createMockRun', () => {
    it('should create a mock run with default values', () => {
      const run = RunFactory.createMockRun();

      expect(run.name).toBe('Mock Run');
      expect(run.notes).toBe('Generated for testing');
      expect(run.route.length).toBeGreaterThan(0);
      expect(run.distance).toBeGreaterThan(0);
      expect(run.duration).toBeGreaterThan(0);
    });

    it('should allow overriding default values', () => {
      const overrides = {
        name: 'Custom Mock',
        notes: 'Custom notes'
      };

      const run = RunFactory.createMockRun(overrides);

      expect(run.name).toBe('Custom Mock');
      expect(run.notes).toBe('Custom notes');
    });

    it('should generate realistic mock data', () => {
      const run = RunFactory.createMockRun();

      // Duration should be reasonable (30 minutes for mock)
      expect(run.duration).toBe(30 * 60); // 30 minutes in seconds

      // Should have multiple GPS points
      expect(run.route.length).toBeGreaterThanOrEqual(10);

      // All GPS points should have valid coordinates
      run.route.forEach(point => {
        expect(point.latitude).toBeGreaterThanOrEqual(-90);
        expect(point.latitude).toBeLessThanOrEqual(90);
        expect(point.longitude).toBeGreaterThanOrEqual(-180);
        expect(point.longitude).toBeLessThanOrEqual(180);
        expect(point.accuracy).toBeGreaterThan(0);
        expect(point.accuracy).toBeLessThan(20);
      });
    });
  });

  describe('createQuickRun', () => {
    it('should create run with specified distance and duration', () => {
      const run = RunFactory.createQuickRun(5, 30, 'Quick 5K');

      expect(run.name).toBe('Quick 5K');
      expect(run.duration).toBe(30 * 60); // 30 minutes
      // Distance should be approximately 5km (allowing for some variance in route generation)
      expect(run.distance).toBeGreaterThan(4000);
      expect(run.distance).toBeLessThan(6000);
    });

    it('should generate default name when not provided', () => {
      const run = RunFactory.createQuickRun(10, 60);

      expect(run.name).toBe('10K Run');
    });

    it('should generate appropriate route for distance', () => {
      const run = RunFactory.createQuickRun(3, 20);

      expect(run.route.length).toBeGreaterThan(10);
      // All points should be reasonably spaced
      for (let i = 1; i < run.route.length; i++) {
        const timeDiff = run.route[i].timestamp.getTime() - run.route[i - 1].timestamp.getTime();
        expect(timeDiff).toBeGreaterThan(0);
        expect(timeDiff).toBeLessThanOrEqual(2000); // Max 2 seconds between points
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty route gracefully', () => {
      const options = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:30:00Z'),
        route: []
      };

      const run = RunFactory.create(options);

      expect(run.distance).toBe(0);
      expect(run.averagePace).toBe(0);
    });

    it('should handle single point route', () => {
      const options = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:30:00Z'),
        route: [mockGPSPoints[0]]
      };

      const run = RunFactory.create(options);

      expect(run.distance).toBe(0);
      expect(run.averagePace).toBe(0);
    });

    it('should handle very short duration', () => {
      const options = {
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:01Z'), // 1 second
        route: mockGPSPoints
      };

      const run = RunFactory.create(options);

      expect(run.duration).toBe(1);
      expect(run.averagePace).toBeGreaterThan(0);
    });
  });
});