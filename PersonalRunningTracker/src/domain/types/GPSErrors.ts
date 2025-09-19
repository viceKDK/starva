// GPS Error types for comprehensive error handling
export type GPSError =
  | 'PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'SIGNAL_LOST'
  | 'TIMEOUT'
  | 'ACCURACY_TOO_LOW'
  | 'INVALID_LOCATION'
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

export const GPSErrorMessages: Record<GPSError, string> = {
  PERMISSION_DENIED: 'Location permission is required to track your runs',
  GPS_DISABLED: 'GPS is disabled. Please enable location services in your device settings',
  SIGNAL_LOST: 'GPS signal lost. Please ensure you have a clear view of the sky',
  TIMEOUT: 'Unable to acquire GPS location within timeout period',
  ACCURACY_TOO_LOW: 'GPS accuracy is too low for reliable tracking',
  INVALID_LOCATION: 'Invalid location data received from GPS',
  SERVICE_UNAVAILABLE: 'Location service is temporarily unavailable',
  UNKNOWN_ERROR: 'An unexpected error occurred while accessing GPS',
};