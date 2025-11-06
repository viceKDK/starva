// Central switch for map implementation used by the app.
// Primary: StaticMapboxImage for Expo Go compatibility
// Note: react-native-maps removed - using @rnmapbox/maps via static image fallback
import React from 'react';
import { Dimensions } from 'react-native';
import { StaticMapboxImage } from './StaticMapboxImage';
import type { RouteMapProps } from './types';

export const CurrentRouteMap: React.FC<RouteMapProps> = ({ points }) => {
  // Using StaticMapboxImage for Expo Go compatibility
  // For production builds, you can switch to MapboxRouteMap with @rnmapbox/maps
  const width = Math.round(Dimensions.get('window').width - 32);
  const height = 300;
  return <StaticMapboxImage points={points} width={width} height={height} />;
};

// Alternative implementations (kept for future use):
// export { ExpoAppleRouteMap as CurrentRouteMap } from './ExpoAppleRouteMap'; // uses expo-maps
// export { MapboxRouteMap as CurrentRouteMap } from './MapboxRouteMap'; // uses @rnmapbox/maps
