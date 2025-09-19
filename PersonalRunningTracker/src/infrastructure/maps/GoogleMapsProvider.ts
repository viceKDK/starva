import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils';
import {
  IMapProvider,
  MapRegion,
  MapMarker,
  RoutePolyline,
  MapSnapshot,
  MapSnapshotOptions,
  GeocodeResult,
  ReverseGeocodeResult,
  MapProviderCapabilities,
  DirectionsRequest,
  DirectionsResult,
  ElevationResult
} from '@/domain/services/IMapProvider';

export interface GoogleMapsConfig {
  apiKey: string;
  language?: string;
  region?: string;
}

export class GoogleMapsProvider implements IMapProvider {
  readonly name = 'Google Maps';
  readonly capabilities: MapProviderCapabilities = {
    supportsStaticMaps: true,
    supportsGeocoding: true,
    supportsReverseGeocoding: true,
    supportsDirections: true,
    supportsElevation: true,
    maxMarkersPerRequest: 100,
    maxWaypointsPerRoute: 23
  };

  private config: GoogleMapsConfig | null = null;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  async initialize(config: GoogleMapsConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('Google Maps API key is required');
    }

    this.config = {
      language: 'en',
      region: 'US',
      ...config
    };

    // Validate API key by making a test request
    try {
      await this.validateApiKey();
    } catch (error) {
      throw new Error(`Google Maps API key validation failed: ${error}`);
    }
  }

  isAvailable(): boolean {
    return this.config !== null;
  }

  async generateStaticMap(options: MapSnapshotOptions): Promise<MapSnapshot> {
    if (!this.config) {
      throw new Error('Google Maps provider not initialized');
    }

    const {
      width,
      height,
      region,
      markers = [],
      polylines = [],
      format = 'png',
      quality = 90
    } = options;

    const params = new URLSearchParams({
      size: `${width}x${height}`,
      center: `${region.latitude},${region.longitude}`,
      zoom: this.calculateZoomLevel(region),
      format,
      maptype: 'roadmap',
      key: this.config.apiKey
    });

    // Add markers
    if (markers.length > 0) {
      const markerString = markers
        .map(marker =>
          `color:${marker.color || 'red'}|${marker.coordinate.latitude},${marker.coordinate.longitude}`
        )
        .join('&markers=');
      params.append('markers', markerString);
    }

    // Add polylines
    if (polylines.length > 0) {
      polylines.forEach(polyline => {
        const pathString = polyline.coordinates
          .map(coord => `${coord.latitude},${coord.longitude}`)
          .join('|');
        params.append('path', `color:${polyline.strokeColor || '0xff0000ff'}|weight:${polyline.strokeWidth || 3}|${pathString}`);
      });
    }

    const url = `${this.baseUrl}/staticmap?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.status}`);
      }

      const blob = await response.blob();
      const uri = URL.createObjectURL(blob);

      return {
        uri,
        width,
        height,
        format
      };
    } catch (error) {
      throw new Error(`Failed to generate static map: ${error}`);
    }
  }

  async geocode(address: string): Promise<GeocodeResult[]> {
    if (!this.config) {
      throw new Error('Google Maps provider not initialized');
    }

    const params = new URLSearchParams({
      address: encodeURIComponent(address),
      key: this.config.apiKey,
      language: this.config.language!
    });

    const url = `${this.baseUrl}/geocode/json?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.status}`);
      }

      return data.results.map((result: any) => ({
        address: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        city: this.extractAddressComponent(result.address_components, 'locality'),
        country: this.extractAddressComponent(result.address_components, 'country'),
        postalCode: this.extractAddressComponent(result.address_components, 'postal_code')
      }));
    } catch (error) {
      throw new Error(`Geocoding request failed: ${error}`);
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    if (!this.config) {
      throw new Error('Google Maps provider not initialized');
    }

    const params = new URLSearchParams({
      latlng: `${latitude},${longitude}`,
      key: this.config.apiKey,
      language: this.config.language!
    });

    const url = `${this.baseUrl}/geocode/json?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || data.results.length === 0) {
        throw new Error(`Reverse geocoding failed: ${data.status}`);
      }

      const result = data.results[0];
      return {
        address: result.formatted_address,
        streetName: this.extractAddressComponent(result.address_components, 'route'),
        city: this.extractAddressComponent(result.address_components, 'locality'),
        state: this.extractAddressComponent(result.address_components, 'administrative_area_level_1'),
        country: this.extractAddressComponent(result.address_components, 'country'),
        postalCode: this.extractAddressComponent(result.address_components, 'postal_code')
      };
    } catch (error) {
      throw new Error(`Reverse geocoding request failed: ${error}`);
    }
  }

  async getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    if (!this.config) {
      throw new Error('Google Maps provider not initialized');
    }

    const params = new URLSearchParams({
      origin: `${request.origin.latitude},${request.origin.longitude}`,
      destination: `${request.destination.latitude},${request.destination.longitude}`,
      mode: request.mode || 'walking',
      key: this.config.apiKey,
      language: this.config.language!
    });

    if (request.waypoints && request.waypoints.length > 0) {
      const waypointsString = request.waypoints
        .map(wp => `${wp.latitude},${wp.longitude}`)
        .join('|');
      params.append('waypoints', waypointsString);
    }

    if (request.avoidTolls) params.append('avoid', 'tolls');
    if (request.avoidHighways) params.append('avoid', 'highways');

    const url = `${this.baseUrl}/directions/json?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Directions request failed: ${data.status}`);
      }

      return data as DirectionsResult;
    } catch (error) {
      throw new Error(`Directions request failed: ${error}`);
    }
  }

  async getElevation(points: Array<{ latitude: number; longitude: number }>): Promise<ElevationResult[]> {
    if (!this.config) {
      throw new Error('Google Maps provider not initialized');
    }

    const locations = points
      .map(point => `${point.latitude},${point.longitude}`)
      .join('|');

    const params = new URLSearchParams({
      locations,
      key: this.config.apiKey
    });

    const url = `${this.baseUrl}/elevation/json?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Elevation request failed: ${data.status}`);
      }

      return data.results.map((result: any) => ({
        elevation: result.elevation,
        resolution: result.resolution,
        location: {
          latitude: result.location.lat,
          longitude: result.location.lng
        }
      }));
    } catch (error) {
      throw new Error(`Elevation request failed: ${error}`);
    }
  }

  calculateRouteRegion(route: GPSPoint[], padding: number = 0.1): MapRegion {
    if (route.length === 0) {
      throw new Error('Route cannot be empty');
    }

    const boundingBox = GeoUtils.calculateBoundingBox(route, padding);

    return {
      latitude: boundingBox.centerLatitude,
      longitude: boundingBox.centerLongitude,
      latitudeDelta: boundingBox.latitudeDelta,
      longitudeDelta: boundingBox.longitudeDelta
    };
  }

  createRouteMarkers(route: GPSPoint[]): MapMarker[] {
    if (route.length === 0) return [];

    const markers: MapMarker[] = [];

    // Start marker
    markers.push({
      id: 'start',
      coordinate: {
        latitude: route[0].latitude,
        longitude: route[0].longitude
      },
      title: 'Start',
      description: 'Run start point',
      color: 'green'
    });

    // End marker (only if different from start)
    if (route.length > 1) {
      const endPoint = route[route.length - 1];
      markers.push({
        id: 'end',
        coordinate: {
          latitude: endPoint.latitude,
          longitude: endPoint.longitude
        },
        title: 'Finish',
        description: 'Run finish point',
        color: 'red'
      });
    }

    return markers;
  }

  createRoutePolyline(route: GPSPoint[], options: Partial<RoutePolyline> = {}): RoutePolyline {
    return {
      coordinates: route.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude
      })),
      strokeColor: options.strokeColor || '#FF6B35',
      strokeWidth: options.strokeWidth || 4,
      strokeOpacity: options.strokeOpacity || 0.8
    };
  }

  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      isFinite(latitude) &&
      isFinite(longitude)
    );
  }

  getTileUrl(z: number, x: number, y: number): string {
    if (!this.config) {
      throw new Error('Google Maps provider not initialized');
    }
    // Google Maps doesn't provide direct tile URLs in their standard API
    // This would require Google Maps JavaScript API or similar
    throw new Error('Direct tile URLs not supported by Google Maps API');
  }

  dispose(): void {
    this.config = null;
  }

  private async validateApiKey(): Promise<void> {
    const params = new URLSearchParams({
      address: 'New York',
      key: this.config!.apiKey
    });

    const url = `${this.baseUrl}/geocode/json?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      throw new Error('Invalid API key or API not enabled');
    }
  }

  private calculateZoomLevel(region: MapRegion): string {
    // Approximate zoom level based on latitude delta
    const latDelta = region.latitudeDelta;
    let zoom = 1;

    if (latDelta >= 40) zoom = 2;
    else if (latDelta >= 20) zoom = 3;
    else if (latDelta >= 10) zoom = 4;
    else if (latDelta >= 5) zoom = 5;
    else if (latDelta >= 2) zoom = 6;
    else if (latDelta >= 1) zoom = 7;
    else if (latDelta >= 0.5) zoom = 8;
    else if (latDelta >= 0.25) zoom = 9;
    else if (latDelta >= 0.125) zoom = 10;
    else if (latDelta >= 0.0625) zoom = 11;
    else if (latDelta >= 0.03125) zoom = 12;
    else if (latDelta >= 0.015625) zoom = 13;
    else if (latDelta >= 0.0078125) zoom = 14;
    else if (latDelta >= 0.00390625) zoom = 15;
    else if (latDelta >= 0.001953125) zoom = 16;
    else if (latDelta >= 0.0009765625) zoom = 17;
    else zoom = 18;

    return zoom.toString();
  }

  private extractAddressComponent(components: any[], type: string): string | undefined {
    const component = components.find(comp => comp.types.includes(type));
    return component?.long_name;
  }
}