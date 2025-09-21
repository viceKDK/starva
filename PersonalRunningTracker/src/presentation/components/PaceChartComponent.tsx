import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Share } from 'react-native';
import { GPSPoint } from '@/domain/entities';
import { GeoUtils } from '@/shared/utils/GeoUtils';

export type PaceChartType = 'time' | 'distance';

type Props = {
  gpsPoints: GPSPoint[];
  chartType?: PaceChartType;
};

type ChartData = {
  labels: string[];
  datasets: { data: number[]; color?: (opacity: number) => string }[];
};

const screenWidth = Dimensions.get('window').width;

export const PaceChartComponent: React.FC<Props> = ({ gpsPoints, chartType = 'time' }) => {
  const [mode, setMode] = useState<PaceChartType>(chartType);
  const viewShotRef = useRef<View>(null);

  const data: ChartData = useMemo(() => {
    if (!gpsPoints || gpsPoints.length < 2) {
      return { labels: [], datasets: [{ data: [] }] };
    }

    const labels: string[] = [];
    const values: number[] = [];

    let baseTime = gpsPoints[0]!.timestamp.getTime();
    let baseDist = 0;

    for (let i = 1; i < gpsPoints.length; i++) {
      const a = gpsPoints[i - 1]!;
      const b = gpsPoints[i]!;
      const meters = GeoUtils.calculateDistance(a, b, { precision: -1 });
      const secs = (b.timestamp.getTime() - a.timestamp.getTime()) / 1000;
      if (secs <= 0 || meters <= 0) continue;
      const paceSecPerKm = secs / (meters / 1000);

      if (mode === 'time') {
        const tSec = Math.round((b.timestamp.getTime() - baseTime) / 1000);
        if (tSec % 15 === 0 || i === gpsPoints.length - 1) {
          labels.push(`${Math.floor(tSec / 60)}:${(tSec % 60).toString().padStart(2, '0')}`);
          values.push(paceSecPerKm / 60); // minutes per km
        }
      } else {
        baseDist += meters;
        const km = baseDist / 1000;
        if (Math.abs(km - Math.round(km * 10) / 10) < 1e-6 || i === gpsPoints.length - 1) {
          labels.push(km.toFixed(1));
          values.push(paceSecPerKm / 60);
        }
      }
    }

    if (labels.length === 0) {
      // Fallback sampling every N points
      const step = Math.max(1, Math.floor(gpsPoints.length / 20));
      let distAcc = 0;
      for (let i = step; i < gpsPoints.length; i += step) {
        const a = gpsPoints[i - step]!;
        const b = gpsPoints[i]!;
        const meters = GeoUtils.calculateDistance(a, b, { precision: -1 });
        const secs = (b.timestamp.getTime() - a.timestamp.getTime()) / 1000;
        if (secs <= 0 || meters <= 0) continue;
        const paceSecPerKm = secs / (meters / 1000);
        if (mode === 'time') {
          const tSec = Math.round((b.timestamp.getTime() - baseTime) / 1000);
          labels.push(`${Math.floor(tSec / 60)}:${(tSec % 60).toString().padStart(2, '0')}`);
        } else {
          distAcc += meters;
          labels.push((distAcc / 1000).toFixed(1));
        }
        values.push(paceSecPerKm / 60);
      }
    }

    return {
      labels,
      datasets: [
        {
          data: values,
          color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
        },
      ],
    };
  }, [gpsPoints, mode]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    propsForDots: { r: '0' },
    propsForBackgroundLines: { strokeDasharray: '3 6' },
  } as const;

  const onShare = async () => {
    try {
      if (!viewShotRef.current) return;
      const uri = await captureRef(viewShotRef, { format: 'png', quality: 0.9 });
      await Share.share({ url: uri, message: 'Pace chart' });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pace Chart</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            onPress={() => setMode('time')}
            style={[styles.modeBtn, mode === 'time' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, mode === 'time' && styles.modeTextActive]}>Time</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('distance')}
            style={[styles.modeBtn, mode === 'distance' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, mode === 'distance' && styles.modeTextActive]}>Distance</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
      {data.datasets[0].data.length === 0 ? (
        <View style={styles.placeholder}> 
          <Text style={styles.placeholderText}>No pace data</Text>
        </View>
      ) : (
        <ViewShot ref={viewShotRef} style={styles.chartWrapper}>
          <LineChart
            data={data}
            width={Math.max(280, Math.round(screenWidth - 32))}
            height={220}
            chartConfig={chartConfig as any}
            withInnerLines
            withOuterLines
            withDots={false}
            bezier
            formatYLabel={(y) => `${Number(y).toFixed(1)} min/km`}
          />
        </ViewShot>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 0, marginTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 14 },
  modeBtnActive: { backgroundColor: '#FFEEE7', borderColor: '#FF6B35' },
  modeText: { color: '#666', fontWeight: '600' },
  modeTextActive: { color: '#FF6B35' },
  shareBtn: { marginLeft: 6, backgroundColor: '#2196F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  shareText: { color: '#fff', fontWeight: '600' },
  placeholder: { height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', borderRadius: 12 },
  placeholderText: { color: '#666' },
  chartWrapper: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
});

export default PaceChartComponent;

