// GPS utility functions for location calculations and validation
import { GPSPoint } from '@/domain/entities';

/**
 * Calculate distance between two GPS points using Haversine formula
 * @param point1 First GPS point
 * @param point2 Second GPS point
 * @returns Distance in meters
 */
export const calculateDistance = (point1: GPSPoint, point2: GPSPoint): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
    Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate total distance for an array of GPS points
 * @param points Array of GPS points
 * @returns Total distance in meters
 */
export const calculateTotalDistance = (points: GPSPoint[]): number => {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const current = points[i];
    if (prev && current) {
      totalDistance += calculateDistance(prev, current);
    }
  }

  return totalDistance;
};

/**
 * Calculate speed between two GPS points
 * @param point1 First GPS point
 * @param point2 Second GPS point
 * @returns Speed in km/h
 */
export const calculateSpeed = (point1: GPSPoint, point2: GPSPoint): number => {
  const distance = calculateDistance(point1, point2); // meters
  const timeDiff = (point2.timestamp.getTime() - point1.timestamp.getTime()) / 1000; // seconds

  if (timeDiff === 0) return 0;

  const speedMs = distance / timeDiff; // meters per second
  return speedMs * 3.6; // convert to km/h
};

/**
 * Calculate average pace for a route
 * @param points Array of GPS points
 * @returns Average pace in seconds per kilometer
 */
export const calculateAveragePace = (points: GPSPoint[]): number => {
  if (points.length < 2) return 0;

  const totalDistance = calculateTotalDistance(points); // meters
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) return 0;

  const totalTime = (lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) / 1000; // seconds

  if (totalDistance === 0) return 0;

  const distanceKm = totalDistance / 1000;
  return totalTime / distanceKm; // seconds per kilometer
};

/**
 * Format pace for display (MM:SS per km)
 * @param paceSecondsPerKm Pace in seconds per kilometer
 * @returns Formatted pace string (e.g., "5:30")
 */
export const formatPace = (paceSecondsPerKm: number): string => {
  if (!isFinite(paceSecondsPerKm) || paceSecondsPerKm <= 0) {
    return '--:--';
  }

  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.round(paceSecondsPerKm % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format distance for display
 * @param meters Distance in meters
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted distance string with unit
 */
export const formatDistance = (meters: number, decimals: number = 2): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const kilometers = meters / 1000;
  return `${kilometers.toFixed(decimals)} km`;
};

/**
 * Validate GPS coordinates
 * @param latitude Latitude value
 * @param longitude Longitude value
 * @returns True if coordinates are valid
 */
export const isValidCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Calculate map bounds for an array of GPS points
 * @param points Array of GPS points
 * @returns Map bounds object with min/max lat/lng
 */
export const calculateMapBounds = (points: GPSPoint[]) => {
  if (points.length === 0) {
    return null;
  }

  const latitudes = points.map(p => p.latitude);
  const longitudes = points.map(p => p.longitude);

  return {
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
  };
};

/**
 * Smooth GPS points by removing obvious outliers
 * @param points Array of GPS points
 * @param maxSpeedKmh Maximum realistic speed in km/h (default: 50)
 * @returns Filtered array of GPS points
 */
export const smoothGPSPoints = (points: GPSPoint[], maxSpeedKmh: number = 50): GPSPoint[] => {
  if (points.length <= 2) return points;

  const firstPoint = points[0];
  if (!firstPoint) return [];

  const smoothedPoints = [firstPoint]; // Always keep first point

  for (let i = 1; i < points.length; i++) {
    const prevPoint = smoothedPoints[smoothedPoints.length - 1];
    const currentPoint = points[i];

    if (!prevPoint || !currentPoint) continue;

    const speed = calculateSpeed(prevPoint, currentPoint);

    // Only add point if speed is realistic
    if (speed <= maxSpeedKmh) {
      smoothedPoints.push(currentPoint);
    }
  }

  return smoothedPoints;
};

// Helper function to convert degrees to radians
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};