// Central switch for map implementation used by the app.
// Primary: StaticMapboxImage for Expo Go compatibility
// Note: react-native-maps removed - using @rnmapbox/maps via static image fallback
import React from 'react';
import { Dimensions } from 'react-native';
import { StaticMapboxImage } from './StaticMapboxImage';
import { ExpoAppleRouteMap } from './ExpoAppleRouteMap';
import type { RouteMapProps } from './types';

export const CurrentRouteMap: React.FC<RouteMapProps> = ({ points, mapType, routeColor, enableAnimation }) => {
  // Try rendering expo-maps. If the module isn't present (Expo Go), fall back to static image.
  try {
    // Probe require; if it throws, we'll go to fallback
    require('expo-maps');
    return (
      <ExpoAppleRouteMap
        points={points}
        enableAnimation={enableAnimation}
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

// Export additional map components
export { EnhancedRouteMap } from './EnhancedRouteMap';
export { GPSQualityIndicator } from './GPSQualityIndicator';
export { StaticMapboxImage } from './StaticMapboxImage';

// Alternative implementations (kept for future use):
// export { ExpoAppleRouteMap as CurrentRouteMap } from './ExpoAppleRouteMap'; // uses expo-maps
// export { MapboxRouteMap as CurrentRouteMap } from './MapboxRouteMap'; // uses @rnmapbox/maps
