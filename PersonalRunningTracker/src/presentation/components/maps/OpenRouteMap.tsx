import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { GPSPoint } from '@/domain/entities';
import { OpenRouteProvider } from '@/infrastructure/maps/OpenRouteProvider';

interface OpenRouteMapProps {
  route: GPSPoint[];
  width?: number;
  height?: number;
  apiKey: string;
}

/**
 * OpenRouteService static map component
 * Uses OpenRouteService API to render route on OpenStreetMap tiles
 */
export const OpenRouteMap: React.FC<OpenRouteMapProps> = ({
  route,
  width = 300,
  height = 200,
  apiKey
}) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const generateMap = async () => {
      if (!route || route.length === 0) {
        setError('No route data available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const provider = new OpenRouteProvider();
        await provider.initialize({ apiKey });

        // Calculate region
        const region = provider.calculateRouteRegion(route, 0.1);

        // Create markers and polyline
        const markers = provider.createRouteMarkers(route);
        const polyline = provider.createRoutePolyline(route);

        // Generate static map
        const mapSnapshot = await provider.generateStaticMap({
          width,
          height,
          region,
          markers,
          polylines: [polyline]
        });

        setImageUrl(mapSnapshot.uri);
        setLoading(false);
      } catch (err) {
        console.error('Failed to generate OpenRoute map:', err);
        setError('Failed to load map');
        setLoading(false);
      }
    };

    generateMap();
  }, [route, width, height, apiKey]);

  if (loading) {
    return (
      <View style={[styles.container, { width, height }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (error || !imageUrl) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.errorText}>{error || 'Failed to load map'}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width, height }]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    padding: 16,
  },
});

export default OpenRouteMap;