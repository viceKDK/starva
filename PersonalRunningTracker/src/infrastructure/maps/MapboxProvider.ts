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

export interface MapboxConfig {
  accessToken: string;
  styleId?: string; // e.g., 'mapbox/streets-v11'
  language?: string;
}

/**
 * Mapbox provider implementing IMapProvider using Mapbox APIs.
 * Uses Static Images API for snapshots and REST APIs for geocoding/directions.
 */
export class MapboxProvider implements IMapProvider {
  readonly name = 'Mapbox';
  readonly capabilities: MapProviderCapabilities = {
    supportsStaticMaps: true,
    supportsGeocoding: true,
    supportsReverseGeocoding: true,
    supportsDirections: true,
    supportsElevation: false, // Mapbox does not provide public elevation per point in standard APIs
    maxMarkersPerRequest: 100,
    maxWaypointsPerRoute: 25
  };

  private config: MapboxConfig | null = null;

  async initialize(config: MapboxConfig): Promise<void> {
    if (!config.accessToken) throw new Error('Mapbox access token is required');
    this.config = {
      styleId: 'mapbox/streets-v11',
      language: 'en',
      ...config,
    };
  }

  isAvailable(): boolean {
    return this.config !== null;
  }

  /**
   * Build a Static Images API URL with path + markers overlays.
   */
  async generateStaticMap(options: MapSnapshotOptions): Promise<MapSnapshot> {
    if (!this.config) throw new Error('Mapbox provider not initialized');

    const { width, height, region, markers = [], polylines = [] } = options;

    const style = this.config.styleId || 'mapbox/streets-v11';
    const token = this.config.accessToken;

    // Build overlays
    const overlayParts: string[] = [];

    // Polyline(s) as path overlays. Mapbox expects lng,lat pairs.
    for (const line of polylines) {
      const coords = line.coordinates
        .map(c => `${c.longitude},${c.latitude}`)
        .join(';');
      const stroke = (line.strokeColor || '#FF6B35').replace('#', '');
      const widthPx = line.strokeWidth || 4;
      overlayParts.push(`path-${widthPx}+${stroke}(${coords})`);
    }

    // Markers (start/end)
    for (const m of markers) {
      const color = (m.color || 'FF6B35').replace('#', '');
      overlayParts.push(`pin-s+${color}(${m.coordinate.longitude},${m.coordinate.latitude})`);
    }

    const overlays = overlayParts.join(',');

    // Center/zoom: use explicit region center and approximate zoom from latitudeDelta
    const center = `${region.longitude},${region.latitude},${this.calculateZoomLevel(region)}`;
    const size = `${Math.round(width)}x${Math.round(height)}`;

    const url = `https://api.mapbox.com/styles/v1/${style}/static/${overlays ? overlays + '/' : ''}${center}/${size}@2x?access_token=${encodeURIComponent(token)}`;

    return {
      uri: url,
      width,
      height,
      format: 'png'
    };
  }

  async geocode(address: string): Promise<GeocodeResult[]> {
    if (!this.config) throw new Error('Mapbox provider not initialized');
    const token = this.config.accessToken;
    const lang = this.config.language || 'en';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${encodeURIComponent(token)}&language=${lang}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data || !data.features) return [];
    return data.features.map((f: any) => ({
      address: f.place_name,
      latitude: f.center[1],
      longitude: f.center[0],
      city: f.context?.find((c: any) => c.id?.startsWith('place'))?.text,
      country: f.context?.find((c: any) => c.id?.startsWith('country'))?.text,
      postalCode: f.context?.find((c: any) => c.id?.startsWith('postcode'))?.text,
    }));
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    if (!this.config) throw new Error('Mapbox provider not initialized');
    const token = this.config.accessToken;
    const lang = this.config.language || 'en';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${encodeURIComponent(token)}&language=${lang}`;

    const res = await fetch(url);
    const data = await res.json();
    const feat = data?.features?.[0];
    if (!feat) return { address: 'Unknown location' };
    return {
      address: feat.place_name,
      streetName: feat.text,
      city: feat.context?.find((c: any) => c.id?.startsWith('place'))?.text,
      state: feat.context?.find((c: any) => c.id?.startsWith('region'))?.text,
      country: feat.context?.find((c: any) => c.id?.startsWith('country'))?.text,
      postalCode: feat.context?.find((c: any) => c.id?.startsWith('postcode'))?.text,
    };
  }

  async getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    if (!this.config) throw new Error('Mapbox provider not initialized');
    const token = this.config.accessToken;
    const profile = request.mode === 'driving' ? 'driving' : request.mode === 'bicycling' ? 'cycling' : request.mode === 'transit' ? 'driving' : 'walking';

    const coords: string[] = [
      `${request.origin.longitude},${request.origin.latitude}`,
      ...(request.waypoints || []).map(wp => `${wp.longitude},${wp.latitude}`),
      `${request.destination.longitude},${request.destination.latitude}`
    ];

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords.join(';')}?geometries=polyline&overview=full&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const data = await res.json();

    // Adapt to DirectionsResult shape
    const route = data?.routes?.[0];
    if (!route) return { routes: [] } as DirectionsResult;

    return {
      routes: [{
        overview_polyline: route.geometry,
        legs: route.legs?.map((leg: any) => ({
          distance: { text: `${Math.round(leg.distance)} m`, value: Math.round(leg.distance) },
          duration: { text: `${Math.round(leg.duration)} s`, value: Math.round(leg.duration) },
          steps: [],
        })) || []
      }]
    };
  }

  async getElevation(_points: Array<{ latitude: number; longitude: number }>): Promise<ElevationResult[]> {
    throw new Error('Elevation data not supported by Mapbox provider');
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
      coordinate: { latitude: route[0].latitude, longitude: route[0].longitude },
      title: 'Start',
      color: '#4CAF50'
    });
    if (route.length > 1) {
      const end = route[route.length - 1];
      markers.push({ id: 'end', coordinate: { latitude: end.latitude, longitude: end.longitude }, title: 'Finish', color: '#F44336' });
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

  private calculateZoomLevel(region: MapRegion): number {
    // Basic approximation similar to Google provider
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
}

