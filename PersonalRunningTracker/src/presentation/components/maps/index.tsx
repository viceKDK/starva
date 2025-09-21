// Central switch for map implementation used by the app.
// Primary: expo-maps (Apple Maps on iOS) when available in a dev build.
// Fallback for Expo Go: StaticMapboxImage (or OSM static image) without native modules.
import React from 'react';
import { Dimensions } from 'react-native';
import { StaticMapboxImage } from './StaticMapboxImage';
import { ExpoAppleRouteMap } from './ExpoAppleRouteMap';
import type { RouteMapProps } from './types';

export const CurrentRouteMap: React.FC<RouteMapProps> = ({ points, mapType, routeColor }) => {
  // Try rendering expo-maps. If the module isn't present (Expo Go), fall back to static image.
  try {
    // Probe require; if it throws, we'll go to fallback
    require('expo-maps');
    return (
      <ExpoAppleRouteMap
        points={points}
        enableAnimation={false}
        {...(mapType ? { mapType } : {})}
        {...(routeColor ? { routeColor } : {})}
      />
    );
  } catch (e) {
    const width = Math.round(Dimensions.get('window').width - 32);
    const height = 200;
    return <StaticMapboxImage points={points} width={width} height={height} />;
  }
};

// Alternative implementations (kept for future use):
// export { AppleRouteMap as CurrentRouteMap } from './AppleRouteMap'; // uses react-native-maps
// export { MapboxRouteMap as CurrentRouteMap } from './MapboxRouteMap'; // uses @rnmapbox/maps
