import { GPSPoint } from '@/domain/entities';

export type RouteMapProps = {
  points: GPSPoint[];
  // When true, shows a button to animate the route drawing from start to end
  enableAnimation?: boolean;
  // Preferred map type when using native maps
  mapType?: 'standard' | 'satellite';
  // Customize route color (hex or rgba). Default: orange.
  routeColor?: string;
  // Show GPS quality indicator
  showGPSQuality?: boolean;
  // Enable pace-based color coding
  showPaceColors?: boolean;
  // Show elevation information
  showElevation?: boolean;
  // Show kilometer markers
  showKilometerMarkers?: boolean;
};
