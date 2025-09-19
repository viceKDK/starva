// Unit tests for ExpoGPSService
import { ExpoGPSService } from '../../../src/infrastructure/gps/ExpoGPSService';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    BestForNavigation: 6,
  },
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('ExpoGPSService', () => {
  let gpsService: ExpoGPSService;

  beforeEach(() => {
    gpsService = new ExpoGPSService();
    jest.clearAllMocks();
  });

  describe('startTracking', () => {
    it('should start tracking successfully with proper permissions', async () => {
      // Mock successful permission and service checks
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: true,
        expires: 'never' as any,
      });
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);

      const mockSubscription = {
        remove: jest.fn(),
      };
      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any);

      const result = await gpsService.startTracking();

      expect(result.success).toBe(true);
      expect(gpsService.isTracking()).toBe(true);
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.hasServicesEnabledAsync).toHaveBeenCalled();
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        expect.any(Function)
      );
    });

    it('should fail when permissions are denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        granted: false,
        canAskAgain: true,
        expires: 'never' as any,
      });

      const result = await gpsService.startTracking();

      expect(result.success).toBe(false);
      expect(result.error).toBe('PERMISSION_DENIED');
      expect(gpsService.isTracking()).toBe(false);
    });

    it('should fail when GPS is disabled', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: true,
        expires: 'never' as any,
      });
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);

      const result = await gpsService.startTracking();

      expect(result.success).toBe(false);
      expect(result.error).toBe('GPS_DISABLED');
      expect(gpsService.isTracking()).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location successfully', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: true,
        expires: 'never' as any,
      });
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);

      const mockLocationData = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationData as any);

      const result = await gpsService.getCurrentLocation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(40.7128);
        expect(result.data.longitude).toBe(-74.0060);
        expect(result.data.altitude).toBe(10);
        expect(result.data.accuracy).toBe(5);
      }
    });

    it('should validate GPS coordinates', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: true,
        expires: 'never' as any,
      });
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);

      // Mock invalid coordinates
      const mockLocationData = {
        coords: {
          latitude: 999, // Invalid latitude
          longitude: -74.0060,
          altitude: 10,
          accuracy: 5,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationData as any);

      const result = await gpsService.getCurrentLocation();

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_LOCATION');
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking and return points', async () => {
      // First start tracking
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: true,
        expires: 'never' as any,
      });
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);

      const mockSubscription = {
        remove: jest.fn(),
      };
      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any);

      await gpsService.startTracking();

      // Now stop tracking
      const result = await gpsService.stopTracking();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(gpsService.isTracking()).toBe(false);
      expect(mockSubscription.remove).toHaveBeenCalled();
    });

    it('should return empty array when not tracking', async () => {
      const result = await gpsService.stopTracking();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('pauseTracking and resumeTracking', () => {
    beforeEach(async () => {
      // Start tracking first
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        granted: true,
        canAskAgain: true,
        expires: 'never' as any,
      });
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);

      const mockSubscription = {
        remove: jest.fn(),
      };
      mockLocation.watchPositionAsync.mockResolvedValue(mockSubscription as any);

      await gpsService.startTracking();
    });

    it('should pause tracking successfully', async () => {
      const result = await gpsService.pauseTracking();

      expect(result.success).toBe(true);
      expect(gpsService.isTracking()).toBe(false); // isTracking considers pause state
    });

    it('should resume tracking successfully', async () => {
      await gpsService.pauseTracking();

      const result = await gpsService.resumeTracking();

      expect(result.success).toBe(true);
      expect(gpsService.isTracking()).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should return tracking points', () => {
      const points = gpsService.getTrackingPoints();
      expect(Array.isArray(points)).toBe(true);
    });

    it('should clear tracking points', () => {
      gpsService.clearTrackingPoints();
      const points = gpsService.getTrackingPoints();
      expect(points).toEqual([]);
    });
  });
});