// GPS utilities unit tests
import {
  calculateDistance,
  calculateTotalDistance,
  calculateSpeed,
  calculateAveragePace,
  formatPace,
  formatDistance,
  isValidCoordinates,
  calculateMapBounds,
  smoothGPSPoints,
} from '@/shared/utils/gpsUtils';
import { GPSPoint } from '@/domain/entities';

describe('GPS Utils', () => {
  const mockPoint1: GPSPoint = {
    latitude: 37.7749,
    longitude: -122.4194,
    timestamp: new Date('2023-01-01T10:00:00Z'),
    accuracy: 10,
  };

  const mockPoint2: GPSPoint = {
    latitude: 37.7849,
    longitude: -122.4094,
    timestamp: new Date('2023-01-01T10:01:00Z'),
    accuracy: 8,
  };

  describe('calculateDistance', () => {
    it('should calculate distance between two GPS points', () => {
      const distance = calculateDistance(mockPoint1, mockPoint2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2000); // Should be less than 2km
    });

    it('should return 0 for identical points', () => {
      const distance = calculateDistance(mockPoint1, mockPoint1);
      expect(distance).toBe(0);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should return 0 for empty array', () => {
      const distance = calculateTotalDistance([]);
      expect(distance).toBe(0);
    });

    it('should return 0 for single point', () => {
      const distance = calculateTotalDistance([mockPoint1]);
      expect(distance).toBe(0);
    });

    it('should calculate total distance for multiple points', () => {
      const points = [mockPoint1, mockPoint2];
      const distance = calculateTotalDistance(points);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('calculateSpeed', () => {
    it('should calculate speed between two points', () => {
      const speed = calculateSpeed(mockPoint1, mockPoint2);
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThan(100); // Should be reasonable speed in km/h
    });

    it('should return 0 for points with same timestamp', () => {
      const sameTimePoint = { ...mockPoint2, timestamp: mockPoint1.timestamp };
      const speed = calculateSpeed(mockPoint1, sameTimePoint);
      expect(speed).toBe(0);
    });
  });

  describe('calculateAveragePace', () => {
    it('should return 0 for empty array', () => {
      const pace = calculateAveragePace([]);
      expect(pace).toBe(0);
    });

    it('should return 0 for single point', () => {
      const pace = calculateAveragePace([mockPoint1]);
      expect(pace).toBe(0);
    });

    it('should calculate average pace for multiple points', () => {
      const points = [mockPoint1, mockPoint2];
      const pace = calculateAveragePace(points);
      expect(pace).toBeGreaterThan(0);
    });
  });

  describe('formatPace', () => {
    it('should format pace correctly', () => {
      const formatted = formatPace(330); // 5:30 per km
      expect(formatted).toBe('5:30');
    });

    it('should handle zero pace', () => {
      const formatted = formatPace(0);
      expect(formatted).toBe('--:--');
    });

    it('should handle invalid pace', () => {
      const formatted = formatPace(Infinity);
      expect(formatted).toBe('--:--');
    });
  });

  describe('formatDistance', () => {
    it('should format meters correctly', () => {
      const formatted = formatDistance(500);
      expect(formatted).toBe('500 m');
    });

    it('should format kilometers correctly', () => {
      const formatted = formatDistance(1500);
      expect(formatted).toBe('1.50 km');
    });

    it('should handle custom decimal places', () => {
      const formatted = formatDistance(1500, 1);
      expect(formatted).toBe('1.5 km');
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(37.7749, -122.4194)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      expect(isValidCoordinates(91, -122.4194)).toBe(false);
      expect(isValidCoordinates(-91, -122.4194)).toBe(false);
    });

    it('should reject invalid longitude', () => {
      expect(isValidCoordinates(37.7749, 181)).toBe(false);
      expect(isValidCoordinates(37.7749, -181)).toBe(false);
    });

    it('should reject NaN values', () => {
      expect(isValidCoordinates(NaN, -122.4194)).toBe(false);
      expect(isValidCoordinates(37.7749, NaN)).toBe(false);
    });
  });

  describe('calculateMapBounds', () => {
    it('should return null for empty array', () => {
      const bounds = calculateMapBounds([]);
      expect(bounds).toBeNull();
    });

    it('should calculate bounds for single point', () => {
      const bounds = calculateMapBounds([mockPoint1]);
      expect(bounds).toEqual({
        minLatitude: mockPoint1.latitude,
        maxLatitude: mockPoint1.latitude,
        minLongitude: mockPoint1.longitude,
        maxLongitude: mockPoint1.longitude,
      });
    });

    it('should calculate bounds for multiple points', () => {
      const bounds = calculateMapBounds([mockPoint1, mockPoint2]);
      expect(bounds).toEqual({
        minLatitude: Math.min(mockPoint1.latitude, mockPoint2.latitude),
        maxLatitude: Math.max(mockPoint1.latitude, mockPoint2.latitude),
        minLongitude: Math.min(mockPoint1.longitude, mockPoint2.longitude),
        maxLongitude: Math.max(mockPoint1.longitude, mockPoint2.longitude),
      });
    });
  });

  describe('smoothGPSPoints', () => {
    it('should return original array for 2 or fewer points', () => {
      const points = [mockPoint1, mockPoint2];
      const smoothed = smoothGPSPoints(points);
      expect(smoothed).toEqual(points);
    });

    it('should filter out high-speed outliers', () => {
      const outlierPoint: GPSPoint = {
        latitude: 40.7589, // Very far from original points
        longitude: -73.9851,
        timestamp: new Date('2023-01-01T10:00:01Z'), // 1 second later
        accuracy: 5,
      };

      const points = [mockPoint1, outlierPoint, mockPoint2];
      const smoothed = smoothGPSPoints(points, 20); // Low speed threshold

      // Should keep first point and filter out outlier
      expect(smoothed.length).toBeLessThan(points.length);
      expect(smoothed[0]).toEqual(mockPoint1);
    });
  });
});