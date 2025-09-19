import { GPSPoint } from '@/domain/entities';

export type RouteMapProps = {
  points: GPSPoint[];
  // When true, shows a button to animate the route drawing from start to end
  enableAnimation?: boolean;
};

