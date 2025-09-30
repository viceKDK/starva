import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils/GeoUtils';
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

export interface OpenRouteConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * OpenRouteService provider implementing IMapProvider.
 * Uses OpenRouteService APIs for directions, geocoding, and elevation data.
 * Free tier: 2000 requests/day, suitable for personal use.
 */
export class OpenRouteProvider implements IMapProvider {
  readonly name = 'OpenRouteService';
  readonly capabilities: MapProviderCapabilities = {
    supportsStaticMaps: true,
    supportsGeocoding: true,
    supportsReverseGeocoding: true,
    supportsDirections: true,
    supportsElevation: false,
    maxMarkersPerRequest: 100,
    maxWaypointsPerRoute: 50
  };

  private config: OpenRouteConfig | null = null;

  async initialize(config: OpenRouteConfig): Promise<void> {
    if (!config.apiKey) throw new Error('OpenRouteService API key is required');
    this.config = {
      baseUrl: 'https://api.openrouteservice.org',
      ...config,
    };
  }

  isAvailable(): boolean {
    return this.config !== null;
  }

  /**
   * Generate static map using OpenStreetMap tiles with route overlay
   */
  async generateStaticMap(options: MapSnapshotOptions): Promise<MapSnapshot> {
    if (!this.config) throw new Error('OpenRouteService provider not initialized');

    const { width, height, region, markers = [], polylines = [] } = options;

    // Use OpenStreetMap tiles for static map rendering
    const zoom = this.calculateZoomLevel(region);
    const center = `${region.latitude},${region.longitude}`;

    // Build overlay for route and markers
    const overlayParts: string[] = [];

    // Polylines
    for (const line of polylines) {
      const coords = line.coordinates
        .map(c => `${c.latitude},${c.longitude}`)
        .join('|');
      const color = (line.strokeColor || '#FF6B35').replace('#', '');
      overlayParts.push(`path-${line.strokeWidth || 4}+${color}:${coords}`);
    }

    // Markers
    for (const m of markers) {
      const color = (m.color || 'FF6B35').replace('#', '');
      overlayParts.push(`pin-s-${m.title?.[0]?.toLowerCase() || 'p'}+${color}:${m.coordinate.latitude},${m.coordinate.longitude}`);
    }

    const overlays = overlayParts.join('|');

    // Using StaticMap API with OpenStreetMap tiles
    const url = `https://api.openrouteservice.org/staticmap?center=${center}&zoom=${zoom}&size=${Math.round(width)}x${Math.round(height)}&markers=${encodeURIComponent(overlays)}&api_key=${this.config.apiKey}`;

    return {
      uri: url,
      width,
      height,
      format: 'png'
    };
  }

  async geocode(address: string): Promise<GeocodeResult[]> {
    if (!this.config) throw new Error('OpenRouteService provider not initialized');

    const url = `${this.config.baseUrl}/geocode/search?api_key=${this.config.apiKey}&text=${encodeURIComponent(address)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.features) return [];

    return data.features.map((f: any) => ({
      address: f.properties.label,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      city: f.properties.locality || f.properties.county,
      country: f.properties.country,
      postalCode: f.properties.postalcode,
    }));
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    if (!this.config) throw new Error('OpenRouteService provider not initialized');

    const url = `${this.config.baseUrl}/geocode/reverse?api_key=${this.config.apiKey}&point.lon=${longitude}&point.lat=${latitude}`;

    const res = await fetch(url);
    const data = await res.json();
    const feat = data?.features?.[0];

    if (!feat) return { address: 'Unknown location' };

    return {
      address: feat.properties.label,
      streetName: feat.properties.street,
      city: feat.properties.locality || feat.properties.county,
      state: feat.properties.region,
      country: feat.properties.country,
      postalCode: feat.properties.postalcode,
    };
  }

  async getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    if (!this.config) throw new Error('OpenRouteService provider not initialized');

    // Map mode to OpenRouteService profile
    const profile = this.mapModeToProfile(request.mode || 'walking');

    // Build coordinates array
    const coordinates: [number, number][] = [
      [request.origin.longitude, request.origin.latitude],
      ...(request.waypoints || []).map(wp => [wp.longitude, wp.latitude] as [number, number]),
      [request.destination.longitude, request.destination.latitude]
    ];

    const url = `${this.config.baseUrl}/v2/directions/${profile}`;

    const body = {
      coordinates,
      elevation: true,
      instructions: true,
      preference: 'recommended',
      units: 'm'
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.config.apiKey
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data || !data.routes) return { routes: [] } as DirectionsResult;

    const route = data.routes[0];

    return {
      routes: [{
        overview_polyline: this.encodePolyline(route.geometry.coordinates),
        legs: route.segments?.map((segment: any) => ({
          distance: {
            text: `${Math.round(segment.distance)} m`,
            value: Math.round(segment.distance)
          },
          duration: {
            text: `${Math.round(segment.duration)} s`,
            value: Math.round(segment.duration)
          },
          steps: segment.steps?.map((step: any) => ({
            distance: { text: `${Math.round(step.distance)} m`, value: Math.round(step.distance) },
            duration: { text: `${Math.round(step.duration)} s`, value: Math.round(step.duration) },
            html_instructions: step.instruction,
            travel_mode: profile.toUpperCase(),
          })) || []
        })) || []
      }]
    };
  }

  async getElevation(_points: Array<{ latitude: number; longitude: number }>): Promise<ElevationResult[]> {
    throw new Error('Elevation data not supported by OpenRouteService provider');
  }

  calculateRouteRegion(route: GPSPoint[], padding: number = 0.1): MapRegion {
    const bb = GeoUtils.calculateBoundingBox(route, padding);
    return {
      latitude: bb.centerLatitude,
      longitude: bb.centerLongitude,
      latitudeDelta: bb.latitudeDelta,
      longitudeDelta: bb.longitudeDelta,
    };
  }

  createRouteMarkers(route: GPSPoint[]): MapMarker[] {
    if (route.length === 0) return [];
    const markers: MapMarker[] = [];
    markers.push({
      id: 'start',
      coordinate: { latitude: route[0]!.latitude, longitude: route[0]!.longitude },
      title: 'Start',
      color: '#4CAF50'
    });
    if (route.length > 1) {
      const end = route[route.length - 1]!;
      markers.push({
        id: 'end',
        coordinate: { latitude: end.latitude, longitude: end.longitude },
        title: 'Finish',
        color: '#F44336'
      });
    }
    return markers;
  }

  createRoutePolyline(route: GPSPoint[], options: Partial<RoutePolyline> = {}): RoutePolyline {
    return {
      coordinates: route.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
      strokeColor: options.strokeColor || '#FF6B35',
      strokeWidth: options.strokeWidth || 4,
      strokeOpacity: options.strokeOpacity || 1,
    };
  }

  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      isFinite(latitude) && isFinite(longitude)
    );
  }

  dispose(): void {
    this.config = null;
  }

  // Helper methods

  private mapModeToProfile(mode: string): string {
    switch (mode) {
      case 'driving':
        return 'driving-car';
      case 'bicycling':
        return 'cycling-regular';
      case 'walking':
        return 'foot-walking';
      default:
        return 'foot-walking';
    }
  }

  private calculateZoomLevel(region: MapRegion): number {
    const latDelta = region.latitudeDelta;
    if (latDelta >= 40) return 2;
    if (latDelta >= 20) return 3;
    if (latDelta >= 10) return 4;
    if (latDelta >= 5) return 5;
    if (latDelta >= 2) return 6;
    if (latDelta >= 1) return 7;
    if (latDelta >= 0.5) return 8;
    if (latDelta >= 0.25) return 9;
    if (latDelta >= 0.125) return 10;
    if (latDelta >= 0.0625) return 11;
    if (latDelta >= 0.03125) return 12;
    if (latDelta >= 0.015625) return 13;
    if (latDelta >= 0.0078125) return 14;
    if (latDelta >= 0.00390625) return 15;
    if (latDelta >= 0.001953125) return 16;
    if (latDelta >= 0.0009765625) return 17;
    return 18;
  }

  /**
   * Simple polyline encoding (Google format)
   */
  private encodePolyline(coordinates: [number, number][]): string {
    let encoded = '';
    let prevLat = 0;
    let prevLng = 0;

    for (const [lng, lat] of coordinates) {
      const lat5 = Math.round(lat * 1e5);
      const lng5 = Math.round(lng * 1e5);

      const dLat = lat5 - prevLat;
      const dLng = lng5 - prevLng;

      encoded += this.encodeValue(dLat);
      encoded += this.encodeValue(dLng);

      prevLat = lat5;
      prevLng = lng5;
    }

    return encoded;
  }

  private encodeValue(num: number): string {
    let value = num < 0 ? ~(num << 1) : (num << 1);
    let encoded = '';

    while (value >= 0x20) {
      encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }

    encoded += String.fromCharCode(value + 63);
    return encoded;
  }
}