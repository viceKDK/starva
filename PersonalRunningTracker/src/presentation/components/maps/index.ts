// Central switch for map implementation used by the app.
// To avoid native dependencies in Expo Go, use a static image preview.
import React from 'react';
import { Dimensions } from 'react-native';
import { StaticMapboxImage } from './StaticMapboxImage';
import type { RouteMapProps } from './types';

export const CurrentRouteMap: React.FC<RouteMapProps> = ({ points }) => {
  const width = Math.round(Dimensions.get('window').width - 32);
  const height = 200;
  return <StaticMapboxImage points={points} width={width} height={height} />;
};
