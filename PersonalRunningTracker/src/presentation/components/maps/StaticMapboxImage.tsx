import React, { useMemo } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils/GeoUtils';
import { MapboxConfig, hasMapboxToken } from '@/shared/config/MapboxConfig';

type Props = {
  points: GPSPoint[];
  width: number;
  height: number;
};

export const StaticMapboxImage: React.FC<Props> = ({ points, width, height }) => {
  const uri = useMemo(() => {
    if (points.length === 0) return null;

    // If Mapbox token exists, use Mapbox Static Images API
    if (hasMapboxToken()) {
      try {
        const mod = require('@/infrastructure/maps/MapboxProvider');
        const Provider = mod.MapboxProvider || mod.default;
        const provider = new Provider();
        provider.initialize({ accessToken: MapboxConfig.ACCESS_TOKEN, styleId: MapboxConfig.STYLE_ID });
        const region = provider.calculateRouteRegion(points, 0.15);
        const markers = provider.createRouteMarkers(points);
        const polyline = provider.createRoutePolyline(points);
        return provider
          .generateStaticMap({
            width,
            height,
            region,
            markers,
            polylines: [polyline],
            format: 'png',
          })
          .then((s: any) => s.uri)
          .catch(() => null);
      } catch {}
    }

    // Fallback: Use OSM static map service (no API key). For dev/testing only.
    const bb = GeoUtils.calculateBoundingBox(points, 0.1);
    const minLat = bb.minLatitude;
    const maxLat = bb.maxLatitude;
    const minLon = bb.minLongitude;
    const maxLon = bb.maxLongitude;

    // Downsample points to limit URL length
    const maxPts = 100;
    const step = Math.max(1, Math.floor(points.length / maxPts));
    const sampled = points.filter((_, i) => i % step === 0);

    const path = sampled
      .map(p => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`)
      .join('|');

    const startPt = points[0]!;
    const endPt = points[points.length - 1]!;
    const start = `${startPt.latitude.toFixed(6)},${startPt.longitude.toFixed(6)},green`;
    const end = `${endPt.latitude.toFixed(6)},${endPt.longitude.toFixed(6)},red`;

    // staticmap.openstreetmap.de
    const url = `https://staticmap.openstreetmap.de/staticmap.php?bbox=${minLon},${minLat},${maxLon},${maxLat}&size=${Math.round(width)}x${Math.round(height)}&scale=2&markers=${start}|${end}&path=color:0xff6b35ff|weight:3|${path}`;
    return Promise.resolve(url);
  }, [points, width, height]);

  const [resolvedUri, setResolvedUri] = React.useState<string | null>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await uri;
      if (mounted) setResolvedUri(u);
    })();
    return () => { mounted = false; };
  }, [uri]);

  if (!resolvedUri) return <View style={[styles.placeholder, { width, height }]} />;
  return (
    <Image source={{ uri: resolvedUri }} style={{ width, height, borderRadius: 8 }} resizeMode="cover" />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  }
});
