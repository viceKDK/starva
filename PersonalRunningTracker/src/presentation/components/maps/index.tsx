// Central switch for map implementation used by the app.
// Primary: OpenRouteService with OpenStreetMap (free tier, open source)
// Fallback: expo-maps (Apple Maps) or StaticMapboxImage
import React from 'react';
import { Dimensions } from 'react-native';
import { OpenRouteMap } from './OpenRouteMap';
import { StaticMapboxImage } from './StaticMapboxImage';
import { ExpoAppleRouteMap } from './ExpoAppleRouteMap';
import type { RouteMapProps } from './types';

// Default OpenRouteService API key (free tier: 2000 requests/day)
const OPENROUTE_API_KEY = process.env.OPENROUTE_API_KEY || 'YOUR_OPENROUTE_API_KEY';

export const CurrentRouteMap: React.FC<RouteMapProps> = ({ points, mapType, routeColor }) => {
  const width = Math.round(Dimensions.get('window').width - 32);
  const height = 200;

  // Primary: OpenRouteService (free tier, open source)
  if (OPENROUTE_API_KEY && OPENROUTE_API_KEY !== 'YOUR_OPENROUTE_API_KEY') {
    return <OpenRouteMap route={points} width={width} height={height} apiKey={OPENROUTE_API_KEY} />;
  }

  // Fallback 1: Try expo-maps (Apple Maps)
  try {
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
    // Fallback 2: StaticMapboxImage
    return <StaticMapboxImage points={points} width={width} height={height} />;
  }
};

// Export additional map components
export { EnhancedRouteMap } from './EnhancedRouteMap';
export { GPSQualityIndicator } from './GPSQualityIndicator';
export { StaticMapboxImage } from './StaticMapboxImage';
export { OpenRouteMap } from './OpenRouteMap';

// Alternative implementations (kept for future use):
// export { AppleRouteMap as CurrentRouteMap } from './AppleRouteMap'; // uses react-native-maps
// export { MapboxRouteMap as CurrentRouteMap } from './MapboxRouteMap'; // uses @rnmapbox/maps
