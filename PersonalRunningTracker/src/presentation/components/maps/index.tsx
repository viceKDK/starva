// Central switch for map implementation used by the app.
// Primary: react-native-maps (Apple Maps on iOS) with full animation support.
// Fallback for Expo Go: StaticMapboxImage (or OSM static image) without native modules.
import React from 'react';
import { Dimensions } from 'react-native';
import { StaticMapboxImage } from './StaticMapboxImage';
import { AppleRouteMap } from './AppleRouteMap';
import type { RouteMapProps } from './types';

export const CurrentRouteMap: React.FC<RouteMapProps> = ({ points, enableAnimation = true }) => {
  // Try rendering react-native-maps with full animation support.
  // If the module isn't present (Expo Go), fall back to static image.
  try {
    // Probe require; if it throws, we'll go to fallback
    require('react-native-maps');
    return <AppleRouteMap points={points} enableAnimation={enableAnimation} />;
  } catch (e) {
    const width = Math.round(Dimensions.get('window').width - 32);
    const height = 300;
    return <StaticMapboxImage points={points} width={width} height={height} />;
  }
};

// Alternative implementations (kept for future use):
// export { ExpoAppleRouteMap as CurrentRouteMap } from './ExpoAppleRouteMap'; // uses expo-maps
// export { MapboxRouteMap as CurrentRouteMap } from './MapboxRouteMap'; // uses @rnmapbox/maps
