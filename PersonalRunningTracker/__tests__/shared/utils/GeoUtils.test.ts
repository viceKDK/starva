import { GeoUtils } from '@/shared/utils/GeoUtils';
import { GPSPoint } from '@/domain/entities';

describe('GeoUtils', () => {
  const mockPoint1: GPSPoint = {
    latitude: 40.7128,
    longitude: -74.0060,
    timestamp: new Date('2024-01-01T10:00:00Z'),
    accuracy: 5,
    altitude: 10
  };

  const mockPoint2: GPSPoint = {
    latitude: 40.7589,
    longitude: -73.9851,
    timestamp: new Date('2024-01-01T10:05:00Z'),
    accuracy: 4,
    altitude: 15
  };

  const mockRoute: GPSPoint[] = [
    mockPoint1,
    {
      latitude: 40.7308,
      longitude: -73.9950,
      timestamp: new Date('2024-01-01T10:02:30Z'),
      accuracy: 6,
      altitude: 12
    },
    mockPoint2
  ];

  describe('calculateDistance', () => {
    it('should calculate distance between two points in meters', () => {
      const distance = GeoUtils.calculateDistance(mockPoint1, mockPoint2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeCloseTo(5129, 0); // Approximate distance between these NYC points
    });

    it('should calculate distance in kilometers', () => {
      const distance = GeoUtils.calculateDistance(mockPoint1, mockPoint2, { unit: 'kilometers' });

      expect(distance).toBeCloseTo(5.129, 2);
    });

    it('should calculate distance in miles', () => {
      const distance = GeoUtils.calculateDistance(mockPoint1, mockPoint2, { unit: 'miles' });

      expect(distance).toBeCloseTo(3.186, 2);
    });

    it('should respect precision parameter', () => {
      const distance = GeoUtils.calculateDistance(mockPoint1, mockPoint2, { precision: 0 });

      expect(distance).toBe(Math.round(distance));
      expect(distance.toString()).not.toContain('.');
    });

    it('should return 0 for identical points', () => {
      const distance = GeoUtils.calculateDistance(mockPoint1, mockPoint1);

      expect(distance).toBe(0);
    });

    it('should handle antipodal points correctly', () => {
      const point1: GPSPoint = {
        latitude: 0,
        longitude: 0,
        timestamp: new Date(),
        accuracy: 5
      };

      const point2: GPSPoint = {
        latitude: 0,
        longitude: 180,
        timestamp: new Date(),
        accuracy: 5
      };

      const distance = GeoUtils.calculateDistance(point1, point2, { unit: 'kilometers' });

      expect(distance).toBeCloseTo(20015, 0); // Half of Earth's circumference
    });
  });

  describe('calculateRouteDistance', () => {
    it('should calculate total distance for route', () => {
      const distance = GeoUtils.calculateRouteDistance(mockRoute);

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
      expect(isFinite(distance)).toBe(true);
    });

    it('should return 0 for empty route', () => {
      const distance = GeoUtils.calculateRouteDistance([]);

      expect(distance).toBe(0);
    });

    it('should return 0 for single point route', () => {
      const distance = GeoUtils.calculateRouteDistance([mockPoint1]);

      expect(distance).toBe(0);
    });

    it('should calculate cumulative distance correctly', () => {
      const segment1Distance = GeoUtils.calculateDistance(mockRoute[0], mockRoute[1]);
      const segment2Distance = GeoUtils.calculateDistance(mockRoute[1], mockRoute[2]);
      const totalDistance = GeoUtils.calculateRouteDistance(mockRoute);

      expect(totalDistance).toBeCloseTo(segment1Distance + segment2Distance, 1);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between two points', () => {
      const bearing = GeoUtils.calculateBearing(mockPoint1, mockPoint2);

      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should return 0 for northward direction', () => {
      const point1: GPSPoint = { latitude: 0, longitude: 0, timestamp: new Date(), accuracy: 5 };
      const point2: GPSPoint = { latitude: 1, longitude: 0, timestamp: new Date(), accuracy: 5 };

      const bearing = GeoUtils.calculateBearing(point1, point2);

      expect(bearing).toBeCloseTo(0, 1);
    });

    it('should return 90 for eastward direction', () => {
      const point1: GPSPoint = { latitude: 0, longitude: 0, timestamp: new Date(), accuracy: 5 };
      const point2: GPSPoint = { latitude: 0, longitude: 1, timestamp: new Date(), accuracy: 5 };

      const bearing = GeoUtils.calculateBearing(point1, point2);

      expect(bearing).toBeCloseTo(90, 1);
    });
  });

  describe('calculateSpeed', () => {
    it('should calculate speed in m/s', () => {
      const speed = GeoUtils.calculateSpeed(mockPoint1, mockPoint2);

      expect(speed).toBeGreaterThan(0);
      expect(typeof speed).toBe('number');
      expect(isFinite(speed)).toBe(true);
    });

    it('should calculate speed in km/h', () => {
      const speed = GeoUtils.calculateSpeed(mockPoint1, mockPoint2, { unit: 'kmh' });

      expect(speed).toBeGreaterThan(0);
      // For 5-minute interval, speed should be reasonable for walking/running
      expect(speed).toBeLessThan(50); // Less than 50 km/h
    });

    it('should calculate speed in mph', () => {
      const speed = GeoUtils.calculateSpeed(mockPoint1, mockPoint2, { unit: 'mph' });

      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThan(30); // Less than 30 mph
    });

    it('should return 0 for zero time difference', () => {
      const point2WithSameTime = { ...mockPoint2, timestamp: mockPoint1.timestamp };
      const speed = GeoUtils.calculateSpeed(mockPoint1, point2WithSameTime);

      expect(speed).toBe(0);
    });

    it('should return 0 for negative time difference', () => {
      const earlierPoint = { ...mockPoint2, timestamp: new Date('2024-01-01T09:00:00Z') };
      const speed = GeoUtils.calculateSpeed(mockPoint1, earlierPoint);

      expect(speed).toBe(0);
    });
  });

  describe('calculateBoundingBox', () => {
    it('should calculate bounding box for route', () => {
      const bbox = GeoUtils.calculateBoundingBox(mockRoute);

      expect(bbox.minLatitude).toBeLessThanOrEqual(bbox.maxLatitude);
      expect(bbox.minLongitude).toBeLessThanOrEqual(bbox.maxLongitude);
      expect(bbox.centerLatitude).toBeGreaterThanOrEqual(bbox.minLatitude);
      expect(bbox.centerLatitude).toBeLessThanOrEqual(bbox.maxLatitude);
      expect(bbox.centerLongitude).toBeGreaterThanOrEqual(bbox.minLongitude);
      expect(bbox.centerLongitude).toBeLessThanOrEqual(bbox.maxLongitude);
      expect(bbox.latitudeDelta).toBeGreaterThan(0);
      expect(bbox.longitudeDelta).toBeGreaterThan(0);
    });

    it('should apply padding correctly', () => {
      const bbox1 = GeoUtils.calculateBoundingBox(mockRoute, 0.1);
      const bbox2 = GeoUtils.calculateBoundingBox(mockRoute, 0.2);

      expect(bbox2.latitudeDelta).toBeGreaterThan(bbox1.latitudeDelta);
      expect(bbox2.longitudeDelta).toBeGreaterThan(bbox1.longitudeDelta);
    });

    it('should handle single point', () => {
      const bbox = GeoUtils.calculateBoundingBox([mockPoint1]);

      expect(bbox.minLatitude).toBe(mockPoint1.latitude);
      expect(bbox.maxLatitude).toBe(mockPoint1.latitude);
      expect(bbox.minLongitude).toBe(mockPoint1.longitude);
      expect(bbox.maxLongitude).toBe(mockPoint1.longitude);
      expect(bbox.latitudeDelta).toBe(0.01); // Minimum delta
      expect(bbox.longitudeDelta).toBe(0.01);
    });

    it('should throw error for empty points array', () => {
      expect(() => GeoUtils.calculateBoundingBox([])).toThrow('Cannot calculate bounding box for empty points array');
    });
  });

  describe('isValidGPSPoint', () => {
    it('should validate correct GPS point', () => {
      expect(GeoUtils.isValidGPSPoint(mockPoint1)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const invalidPoint = { ...mockPoint1, latitude: 91 };
      expect(GeoUtils.isValidGPSPoint(invalidPoint)).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const invalidPoint = { ...mockPoint1, longitude: 181 };
      expect(GeoUtils.isValidGPSPoint(invalidPoint)).toBe(false);
    });

    it('should reject invalid timestamp', () => {
      const invalidPoint = { ...mockPoint1, timestamp: new Date('invalid') };
      expect(GeoUtils.isValidGPSPoint(invalidPoint)).toBe(false);
    });

    it('should reject missing required fields', () => {
      const incompletePoint = { latitude: 40.7128, longitude: -74.0060 };
      expect(GeoUtils.isValidGPSPoint(incompletePoint)).toBe(false);
    });
  });

  describe('filterValidPoints', () => {
    it('should filter out invalid points', () => {
      const mixedPoints = [
        mockPoint1,
        { latitude: 91, longitude: -74.0060, timestamp: new Date() }, // Invalid lat
        mockPoint2,
        { latitude: 40.7128, longitude: 181, timestamp: new Date() }, // Invalid lng
        { latitude: 40.7128, longitude: -74.0060, timestamp: new Date('invalid') } // Invalid timestamp
      ];

      const validPoints = GeoUtils.filterValidPoints(mixedPoints);

      expect(validPoints).toHaveLength(2);
      expect(validPoints[0]).toEqual(mockPoint1);
      expect(validPoints[1]).toEqual(mockPoint2);
    });

    it('should return empty array for all invalid points', () => {
      const invalidPoints = [
        { latitude: 91, longitude: -74.0060, timestamp: new Date() },
        { latitude: 40.7128, longitude: 181, timestamp: new Date() }
      ];

      const validPoints = GeoUtils.filterValidPoints(invalidPoints);

      expect(validPoints).toHaveLength(0);
    });
  });

  describe('smoothRoute', () => {
    it('should remove points with poor accuracy', () => {
      const routeWithPoorAccuracy = [
        mockPoint1,
        { ...mockPoint1, latitude: 40.7130, accuracy: 100 }, // Poor accuracy
        mockPoint2
      ];

      const smoothed = GeoUtils.smoothRoute(routeWithPoorAccuracy, 50, 50);

      expect(smoothed).toHaveLength(2);
      expect(smoothed[0]).toEqual(mockPoint1);
      expect(smoothed[1]).toEqual(mockPoint2);
    });

    it('should remove points with impossible speed', () => {
      const routeWithHighSpeed = [
        mockPoint1,
        { ...mockPoint2, timestamp: new Date(mockPoint1.timestamp.getTime() + 1000) }, // 1 second later
        mockPoint2
      ];

      const smoothed = GeoUtils.smoothRoute(routeWithHighSpeed, 10); // Max 10 km/h

      expect(smoothed.length).toBeLessThan(routeWithHighSpeed.length);
    });

    it('should preserve first and last points', () => {
      const smoothed = GeoUtils.smoothRoute(mockRoute);

      expect(smoothed[0]).toEqual(mockRoute[0]);
      expect(smoothed[smoothed.length - 1]).toEqual(mockRoute[mockRoute.length - 1]);
    });
  });

  describe('calculateRouteEfficiency', () => {
    it('should calculate route efficiency', () => {
      const efficiency = GeoUtils.calculateRouteEfficiency(mockRoute);

      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(1);
    });

    it('should return 1 for straight line route', () => {
      const straightRoute = [mockPoint1, mockPoint2];
      const efficiency = GeoUtils.calculateRouteEfficiency(straightRoute);

      expect(efficiency).toBeCloseTo(1, 2);
    });

    it('should return 1 for single point', () => {
      const efficiency = GeoUtils.calculateRouteEfficiency([mockPoint1]);

      expect(efficiency).toBe(1);
    });

    it('should return 1 for empty route', () => {
      const efficiency = GeoUtils.calculateRouteEfficiency([]);

      expect(efficiency).toBe(1);
    });
  });
});