import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';
import { GPSPoint } from '@/domain/entities';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  points: GPSPoint[];
  onClose?: () => void;
  height?: number;
};

// Projects latitude/longitude into view coordinates while preserving aspect ratio
function useProject(points: GPSPoint[], width: number, height: number, padding = 12) {
  return useMemo(() => {
    if (!points || points.length === 0) {
      return { project: (_: GPSPoint) => ({ x: width / 2, y: height / 2 }) };
    }
    const lats = points.map(p => p.latitude);
    const lngs = points.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 0.00001);
    const spanLng = Math.max(maxLng - minLng, 0.00001);
    // In screens, Y grows downward; invert latitude
    const innerW = Math.max(1, width - padding * 2);
    const innerH = Math.max(1, height - padding * 2);
    const scale = Math.min(innerW / spanLng, innerH / spanLat);
    const offsetX = (width - scale * spanLng) / 2;
    const offsetY = (height - scale * spanLat) / 2;
    const project = (p: GPSPoint) => {
      const x = offsetX + (p.longitude - minLng) * scale;
      const y = height - (offsetY + (p.latitude - minLat) * scale);
      return { x, y };
    };
    return { project };
  }, [points, width, height, padding]);
}

export const RouteLivePreview: React.FC<Props> = ({ points, onClose, height = 280 }) => {
  const width = Math.round(Dimensions.get('window').width - 32);
  const { project } = useProject(points, width, height);
  const [idx, setIdx] = useState(1);
  const [animating, setAnimating] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Build coordinates string for SVG Polyline
  const coords = useMemo(() => {
    const slice = points.slice(0, Math.max(1, idx));
    return slice.map(p => {
      const { x, y } = project(p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [points, idx, project]);

  // Drive animation by timestamps (compressed)
  useEffect(() => {
    if (!animating || points.length < 2) return;
    if (idx >= points.length) return;
    const i = idx;
    const t1 = points[i - 1].timestamp.getTime();
    const t2 = points[i].timestamp.getTime();
    const delta = Math.max(50, (t2 - t1) / 20); // 20x speed, min 50ms
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIdx(i + 1), delta);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [animating, idx, points]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!points || points.length === 0) {
    return (
      <View style={[styles.wrapper, { height }]}> 
        <Text style={styles.empty}>No GPS data</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}> 
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#f8f9fa" rx={12} />
        <Polyline
          points={coords}
          fill="none"
          stroke="#FF6B35"
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.primary]} onPress={() => setAnimating(!animating)}>
          <Ionicons name={animating ? 'pause' : 'play'} size={16} color="#fff" />
          <Text style={styles.btnText}>{animating ? 'Pausar' : 'Reanudar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => { setIdx(1); setAnimating(true); }}>
          <Ionicons name="refresh" size={16} color="#333" />
          <Text style={[styles.btnText, { color: '#333' }]}>Reiniciar</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Ionicons name="close" size={16} color="#333" />
            <Text style={[styles.btnText, { color: '#333' }]}>Cerrar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: Math.round(Dimensions.get('window').width - 32),
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  actions: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primary: {
    backgroundColor: '#2196F3',
  },
  btnText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

export default RouteLivePreview;

