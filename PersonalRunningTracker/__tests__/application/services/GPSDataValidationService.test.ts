import { GPSDataValidationService } from '@/application/services/GPSDataValidationService';
import { GPSPoint } from '@/domain/entities';

describe('GPSDataValidationService', () => {
  let service: GPSDataValidationService;

  beforeEach(() => {
    service = new GPSDataValidationService();
  });

  const createMockGPSPoint = (overrides: Partial<GPSPoint> = {}): GPSPoint => ({
    latitude: 40.7128,
    longitude: -74.0060,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    accuracy: 5,
    altitude: 10,
    ...overrides
  });

  const createValidRoute = (): GPSPoint[] => [
    createMockGPSPoint({ timestamp: new Date('2024-01-01T10:00:00Z') }),
    createMockGPSPoint({
      latitude: 40.7138,
      longitude: -74.0070,
      timestamp: new Date('2024-01-01T10:00:05Z')
    }),
    createMockGPSPoint({
      latitude: 40.7148,
      longitude: -74.0080,
      timestamp: new Date('2024-01-01T10:00:10Z')
    }),
    createMockGPSPoint({
      latitude: 40.7158,
      longitude: -74.0090,
      timestamp: new Date('2024-01-01T10:00:15Z')
    }),
    createMockGPSPoint({
      latitude: 40.7168,
      longitude: -74.0100,
      timestamp: new Date('2024-01-01T10:00:20Z')
    })
  ];

  describe('validateAndFilterGPSData', () => {
    it('should validate clean GPS data successfully', () => {
      const validRoute = createValidRoute();
      const result = service.validateAndFilterGPSData(validRoute);

      expect(result.isValid).toBe(true);
      expect(result.filteredPoints).toHaveLength(validRoute.length);
      expect(result.removedPoints).toBe(0);
      expect(result.qualityScore).toBeGreaterThan(80);
      expect(result.averageAccuracy).toBe(5);
    });

    it('should reject insufficient GPS points', () => {
      const insufficientPoints = createValidRoute().slice(0, 2); // Only 2 points
      const result = service.validateAndFilterGPSData(insufficientPoints);

      expect(result.isValid).toBe(false);
      expect(result.filteredPoints).toHaveLength(0);
      expect(result.qualityScore).toBe(0);
    });

    it('should filter out points with poor accuracy', () => {
      const routeWithPoorAccuracy = createValidRoute();
      routeWithPoorAccuracy[2] = createMockGPSPoint({
        latitude: 40.7148,
        longitude: -74.0080,
        timestamp: new Date('2024-01-01T10:00:10Z'),
        accuracy: 100 // Very poor accuracy
      });

      const result = service.validateAndFilterGPSData(routeWithPoorAccuracy);

      expect(result.isValid).toBe(true);
      expect(result.filteredPoints.length).toBeLessThan(routeWithPoorAccuracy.length);
      expect(result.removedPoints).toBeGreaterThan(0);
    });

    it('should filter out points with impossible speeds', () => {
      const routeWithHighSpeed = createValidRoute();
      // Move a point very far away in short time (impossible speed)
      routeWithHighSpeed[2] = createMockGPSPoint({
        latitude: 41.0000, // Very far from previous point
        longitude: -74.0080,
        timestamp: new Date('2024-01-01T10:00:11Z'), // Only 1 second later
        accuracy: 5
      });

      const result = service.validateAndFilterGPSData(routeWithHighSpeed);

      expect(result.isValid).toBe(true);
      expect(result.filteredPoints.length).toBeLessThan(routeWithHighSpeed.length);
      expect(result.removedPoints).toBeGreaterThan(0);
    });

    it('should filter out outlier points', () => {
      const routeWithOutliers = createValidRoute();
      // Insert an outlier point that's way off the expected path
      routeWithOutliers.splice(2, 0, createMockGPSPoint({
        latitude: 40.8000, // Way off the path
        longitude: -73.9000,
        timestamp: new Date('2024-01-01T10:00:07Z'),
        accuracy: 5
      }));

      const result = service.validateAndFilterGPSData(routeWithOutliers);

      expect(result.isValid).toBe(true);
      expect(result.filteredPoints.length).toBeLessThan(routeWithOutliers.length);
      expect(result.removedPoints).toBeGreaterThan(0);
    });

    it('should calculate quality score correctly', () => {
      const perfectRoute = createValidRoute();
      const result = service.validateAndFilterGPSData(perfectRoute);

      expect(result.qualityScore).toBeGreaterThan(80);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should handle route with no accuracy data', () => {
      const routeWithoutAccuracy = createValidRoute().map(point => ({
        ...point,
        accuracy: undefined
      }));

      const result = service.validateAndFilterGPSData(routeWithoutAccuracy);

      expect(result.isValid).toBe(true);
      expect(result.averageAccuracy).toBe(0);
      expect(result.qualityScore).toBeGreaterThan(0);
    });

    it('should preserve first and last points', () => {
      const route = createValidRoute();
      const firstPoint = route[0];
      const lastPoint = route[route.length - 1];

      // Make middle points have poor accuracy
      for (let i = 1; i < route.length - 1; i++) {
        route[i].accuracy = 100;
      }

      const result = service.validateAndFilterGPSData(route);

      expect(result.filteredPoints[0]).toEqual(firstPoint);
      expect(result.filteredPoints[result.filteredPoints.length - 1]).toEqual(lastPoint);
    });

    it('should handle duplicate timestamps correctly', () => {
      const routeWithDuplicates = createValidRoute();
      routeWithDuplicates[2].timestamp = routeWithDuplicates[1].timestamp; // Same timestamp

      const result = service.validateAndFilterGPSData(routeWithDuplicates);

      expect(result.isValid).toBe(true);
      // Should keep the more accurate point or handle appropriately
      expect(result.filteredPoints.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getQualityAssessment', () => {
    it('should return correct assessment for excellent quality', () => {
      const assessment = service.getQualityAssessment(90);

      expect(assessment.level).toBe('Excellent');
      expect(assessment.color).toBe('#4CAF50');
      expect(assessment.description).toContain('High-quality');
    });

    it('should return correct assessment for good quality', () => {
      const assessment = service.getQualityAssessment(70);

      expect(assessment.level).toBe('Good');
      expect(assessment.color).toBe('#8BC34A');
      expect(assessment.description).toContain('Good GPS data');
    });

    it('should return correct assessment for fair quality', () => {
      const assessment = service.getQualityAssessment(50);

      expect(assessment.level).toBe('Fair');
      expect(assessment.color).toBe('#FF9800');
      expect(assessment.description).toContain('Acceptable');
    });

    it('should return correct assessment for poor quality', () => {
      const assessment = service.getQualityAssessment(30);

      expect(assessment.level).toBe('Poor');
      expect(assessment.color).toBe('#F44336');
      expect(assessment.description).toContain('Poor GPS data');
    });
  });

  describe('edge cases', () => {
    it('should handle empty route', () => {
      const result = service.validateAndFilterGPSData([]);

      expect(result.isValid).toBe(false);
      expect(result.filteredPoints).toHaveLength(0);
      expect(result.qualityScore).toBe(0);
    });

    it('should handle single point route', () => {
      const singlePoint = [createMockGPSPoint()];
      const result = service.validateAndFilterGPSData(singlePoint);

      expect(result.isValid).toBe(false);
      expect(result.qualityScore).toBe(0);
    });

    it('should handle route with all invalid points', () => {
      const invalidRoute = [
        createMockGPSPoint({ accuracy: 1000 }), // Very poor accuracy
        createMockGPSPoint({ accuracy: 1000 }),
        createMockGPSPoint({ accuracy: 1000 }),
        createMockGPSPoint({ accuracy: 1000 }),
        createMockGPSPoint({ accuracy: 1000 })
      ];

      const result = service.validateAndFilterGPSData(invalidRoute);

      expect(result.isValid).toBe(true); // Should still be valid as it preserves first/last
      expect(result.filteredPoints.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle very short time intervals', () => {
      const route = createValidRoute();
      // Make all points have the same timestamp
      const baseTime = new Date('2024-01-01T10:00:00Z');
      route.forEach((point, index) => {
        point.timestamp = new Date(baseTime.getTime() + index * 100); // 100ms intervals
      });

      const result = service.validateAndFilterGPSData(route);

      expect(result.isValid).toBe(true);
      expect(result.filteredPoints.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('configuration options', () => {
    it('should respect custom max speed configuration', () => {
      const customService = new GPSDataValidationService({ maxSpeed: 5 }); // Very low max speed
      const routeWithNormalSpeed = createValidRoute();

      // Normal walking speed should now be considered too fast
      const result = customService.validateAndFilterGPSData(routeWithNormalSpeed);

      expect(result.removedPoints).toBeGreaterThan(0);
    });

    it('should respect custom accuracy threshold', () => {
      const customService = new GPSDataValidationService({ maxAccuracy: 3 }); // Very strict accuracy
      const routeWithNormalAccuracy = createValidRoute();

      const result = customService.validateAndFilterGPSData(routeWithNormalAccuracy);

      expect(result.removedPoints).toBeGreaterThan(0);
    });

    it('should respect custom minimum points requirement', () => {
      const customService = new GPSDataValidationService({ minPointsRequired: 10 });
      const shortRoute = createValidRoute(); // Only 5 points

      const result = customService.validateAndFilterGPSData(shortRoute);

      expect(result.isValid).toBe(false);
    });
  });

  describe('performance', () => {
    it('should handle large routes efficiently', () => {
      // Create a large route (1000 points)
      const largeRoute: GPSPoint[] = [];
      const baseTime = new Date('2024-01-01T10:00:00Z');

      for (let i = 0; i < 1000; i++) {
        largeRoute.push(createMockGPSPoint({
          latitude: 40.7128 + (i * 0.0001),
          longitude: -74.0060 + (i * 0.0001),
          timestamp: new Date(baseTime.getTime() + i * 1000),
          accuracy: 3 + Math.random() * 4 // 3-7 meters
        }));
      }

      const startTime = Date.now();
      const result = service.validateAndFilterGPSData(largeRoute);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.filteredPoints.length).toBeGreaterThan(990); // Should keep most points
    });
  });
});