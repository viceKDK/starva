import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GPSPoint } from '@/domain/entities';
import { StaticMapboxImage } from './StaticMapboxImage';
import { MapboxConfig, hasMapboxToken } from '@/shared/config/MapboxConfig';
import { GeoUtils } from '@/shared/utils/GeoUtils';
import { RouteSimplificationService } from '@/infrastructure/maps/RouteSimplificationService';

type Props = {
  points: GPSPoint[];
  height?: number;
};

export const MapboxRouteMap: React.FC<Props> = ({ points, height = 220 }) => {
  const width = Dimensions.get('window').width - 32;

  // Simplify route for better performance
  const simplifiedPoints = useMemo(() => {
    if (!points || points.length === 0) return [];

    const config = RouteSimplificationService.getOptimalConfig(points);
    return RouteSimplificationService.simplifyRoute(points, config);
  }, [points]);

  // Fallback to static image if no token or not enough points
  if (!hasMapboxToken() || simplifiedPoints.length === 0) {
    return (
      <StaticMapboxImage points={points} width={width} height={height} />
    );
  }

  let MapboxGL: any = null;
  try {
    // Dynamically require to avoid bundling errors if package not installed yet
    MapboxGL = require('@rnmapbox/maps');
  } catch (e) {
    return <StaticMapboxImage points={points} width={width} height={height} />;
  }

  if (!MapboxGL) {
    return <StaticMapboxImage points={points} width={width} height={height} />;
  }

  if (MapboxGL?.default) {
    MapboxGL = MapboxGL.default; // some setups export default
  }

  // No token needed when using MapLibre + public styles

  const coords = simplifiedPoints.map(p => [p.longitude, p.latitude]);
  const bbox = GeoUtils.calculateBoundingBox(simplifiedPoints, 0.15);

  const lineGeoJSON = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
  } as const;

  const startPoint = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [points[0].longitude, points[0].latitude] },
    properties: { color: '#4CAF50' },
  } as const;
  const endPoint = points.length > 1 ? {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [points[points.length - 1].longitude, points[points.length - 1].latitude] },
    properties: { color: '#F44336' },
  } as const : null;

  return (
    <View style={[styles.container, { height }]}>      
      {/* MapLibre demo style (OSM). For production, switch to a provider like MapTiler (requires a free key). */}
      <MapboxGL.MapView style={styles.map} styleURL={"https://demotiles.maplibre.org/style.json"}>
        <MapboxGL.Camera
          bounds={{
            ne: [bbox.maxLongitude, bbox.maxLatitude],
            sw: [bbox.minLongitude, bbox.minLatitude],
            paddingTop: 20,
            paddingBottom: 20,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        />

        <MapboxGL.ShapeSource id="route" shape={lineGeoJSON}>
          <MapboxGL.LineLayer id="route-line" style={{ lineColor: '#FF6B35', lineWidth: 4, lineCap: 'round', lineJoin: 'round' }} />
        </MapboxGL.ShapeSource>

        <MapboxGL.ShapeSource id="start" shape={startPoint}>
          <MapboxGL.CircleLayer id="start-circle" style={{ circleRadius: 6, circleColor: '#4CAF50' }} />
        </MapboxGL.ShapeSource>

        {endPoint && (
          <MapboxGL.ShapeSource id="end" shape={endPoint}>
            <MapboxGL.CircleLayer id="end-circle" style={{ circleRadius: 6, circleColor: '#F44336' }} />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  }
});
