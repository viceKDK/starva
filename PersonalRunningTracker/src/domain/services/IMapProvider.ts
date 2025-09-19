import { GPSPoint } from '@/domain/entities';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
  color?: string;
}

export interface RoutePolyline {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

export interface MapSnapshot {
  uri: string;
  width: number;
  height: number;
  format: 'png' | 'jpg';
}

export interface MapSnapshotOptions {
  width: number;
  height: number;
  region: MapRegion;
  markers?: MapMarker[];
  polylines?: RoutePolyline[];
  format?: 'png' | 'jpg';
  quality?: number;
}

export interface GeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface ReverseGeocodeResult {
  address: string;
  streetName?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface MapProviderCapabilities {
  supportsStaticMaps: boolean;
  supportsGeocoding: boolean;
  supportsReverseGeocoding: boolean;
  supportsDirections: boolean;
  supportsElevation: boolean;
  maxMarkersPerRequest: number;
  maxWaypointsPerRoute: number;
}

export interface DirectionsRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  waypoints?: Array<{ latitude: number; longitude: number }>;
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export interface DirectionsResult {
  routes: Array<{
    overview_polyline: string;
    legs: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      steps: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
      }>;
    }>;
  }>;
}

export interface ElevationResult {
  elevation: number; // meters above sea level
  resolution: number; // meters
  location: { latitude: number; longitude: number };
}

/**
 * Abstract interface for map service providers
 * Supports Google Maps, Apple Maps, and other mapping services
 */
export interface IMapProvider {
  readonly name: string;
  readonly capabilities: MapProviderCapabilities;

  /**
   * Initialize the map provider with API key and configuration
   */
  initialize(config: Record<string, any>): Promise<void>;

  /**
   * Check if the provider is available and properly configured
   */
  isAvailable(): boolean;

  /**
   * Generate a static map image URL or buffer
   */
  generateStaticMap(options: MapSnapshotOptions): Promise<MapSnapshot>;

  /**
   * Geocode an address to coordinates
   */
  geocode(address: string): Promise<GeocodeResult[]>;

  /**
   * Reverse geocode coordinates to address
   */
  reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult>;

  /**
   * Get directions between points
   */
  getDirections(request: DirectionsRequest): Promise<DirectionsResult>;

  /**
   * Get elevation data for points
   */
  getElevation(points: Array<{ latitude: number; longitude: number }>): Promise<ElevationResult[]>;

  /**
   * Calculate optimal region to display route
   */
  calculateRouteRegion(route: GPSPoint[], padding?: number): MapRegion;

  /**
   * Create markers for route start/end points
   */
  createRouteMarkers(route: GPSPoint[]): MapMarker[];

  /**
   * Create polyline for route visualization
   */
  createRoutePolyline(route: GPSPoint[], options?: Partial<RoutePolyline>): RoutePolyline;

  /**
   * Validate coordinates
   */
  validateCoordinates(latitude: number, longitude: number): boolean;

  /**
   * Get provider-specific map tile URL (if applicable)
   */
  getTileUrl?(z: number, x: number, y: number): string;

  /**
   * Clean up resources
   */
  dispose(): void;
}