import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Alert
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { GPSPoint } from '@/domain/entities';
import {
  PaceAnalysisService,
  PaceAnalysis,
  PaceDataPoint,
  KilometerSplit,
  PaceZone
} from '@/application/services/PaceAnalysisService';

const screenWidth = Dimensions.get('window').width;

export interface AdvancedPaceChartProps {
  gpsPoints: GPSPoint[];
  onDataPointPress?: (point: PaceDataPoint) => void;
  showZoneAnalysis?: boolean;
  showSplitTable?: boolean;
  enableExport?: boolean;
}

export const AdvancedPaceChart: React.FC<AdvancedPaceChartProps> = ({
  gpsPoints,
  onDataPointPress,
  showZoneAnalysis = true,
  showSplitTable = true,
  enableExport = true
}) => {
  const [chartType, setChartType] = useState<'time' | 'distance'>('time');
  const [selectedDataPoint, setSelectedDataPoint] = useState<PaceDataPoint | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const viewShotRef = useRef<View>(null);

  // Process pace data
  const paceAnalysis = useMemo(() => {
    return PaceAnalysisService.processGPSDataForPacing(gpsPoints);
  }, [gpsPoints]);

  const paceDataPoints = useMemo(() => {
    return PaceAnalysisService.createPaceDataPoints(gpsPoints, 5);
  }, [gpsPoints]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (paceDataPoints.length === 0) {
      return { labels: [], datasets: [{ data: [] }] };
    }

    const labels: string[] = [];
    const values: number[] = [];

    // Sample data points for chart (max 20 points for readability)
    const step = Math.max(1, Math.floor(paceDataPoints.length / 20));

    for (let i = 0; i < paceDataPoints.length; i += step) {
      const point = paceDataPoints[i];

      if (chartType === 'time') {
        const minutes = Math.floor(point.time / 60);
        labels.push(`${minutes}:${(point.time % 60).toString().padStart(2, '0')}`);
      } else {
        labels.push((point.distance / 1000).toFixed(1));
      }

      values.push(point.pace / 60); // Convert to minutes per km
    }

    return {
      labels,
      datasets: [{
        data: values,
        color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
        strokeWidth: 3
      }]
    };
  }, [paceDataPoints, chartType]);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#FF6B35' },
    propsForBackgroundLines: { strokeDasharray: '3 6' },
    fillShadowGradient: '#FF6B35',
    fillShadowGradientOpacity: 0.1,
    bezier: true
  };

  const handleDataPointClick = useCallback((data: any) => {
    if (data.index !== undefined && paceDataPoints[data.index * Math.max(1, Math.floor(paceDataPoints.length / 20))]) {
      const point = paceDataPoints[data.index * Math.max(1, Math.floor(paceDataPoints.length / 20))];
      setSelectedDataPoint(point);
      onDataPointPress?.(point);
    }
  }, [paceDataPoints, onDataPointPress]);

  const handleExportChart = async () => {
    if (!viewShotRef.current) return;

    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 0.9,
        width: screenWidth - 32,
        height: 400
      });

      await Share.share({
        url: uri,
        message: 'Pace analysis chart from my run'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export chart');
    }
  };

  const handleShareAnalysis = async () => {
    const formatPace = (pace: number) => {
      const min = Math.floor(pace / 60);
      const sec = Math.floor(pace % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const analysisText = `📊 Pace Analysis Summary

⚡ Average Pace: ${formatPace(paceAnalysis.averagePace)}/km
🚀 Fastest Split: ${paceAnalysis.fastestSplit ? `${formatPace(paceAnalysis.fastestSplit.pace)}/km (KM ${paceAnalysis.fastestSplit.kilometer})` : 'N/A'}
🐌 Slowest Split: ${paceAnalysis.slowestSplit ? `${formatPace(paceAnalysis.slowestSplit.pace)}/km (KM ${paceAnalysis.slowestSplit.kilometer})` : 'N/A'}
📈 Pace Consistency: ${paceAnalysis.paceConsistency.toFixed(1)}s variation
🏃‍♂️ Split Strategy: ${paceAnalysis.positiveNegativeSplit} split

#running #paceanalysis #training`;

    try {
      await Share.share({ message: analysisText });
    } catch (error) {
      Alert.alert('Error', 'Failed to share analysis');
    }
  };

  const handleCopyStats = async () => {
    const formatPace = (pace: number) => {
      const min = Math.floor(pace / 60);
      const sec = Math.floor(pace % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const statsText = `Average Pace: ${formatPace(paceAnalysis.averagePace)}/km
Fastest Split: ${paceAnalysis.fastestSplit ? formatPace(paceAnalysis.fastestSplit.pace) : 'N/A'}/km
Slowest Split: ${paceAnalysis.slowestSplit ? formatPace(paceAnalysis.slowestSplit.pace) : 'N/A'}/km
Pace Consistency: ${paceAnalysis.paceConsistency.toFixed(1)}s`;

    try {
      await Clipboard.setStringAsync(statsText);
      Alert.alert('Copied', 'Pace statistics copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy statistics');
    }
  };

  const formatPace = (pace: number): string => {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (paceDataPoints.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pace Analysis</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="speedometer-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Insufficient GPS data for pace analysis</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with controls */}
      <View style={styles.header}>
        <Text style={styles.title}>Pace Analysis</Text>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, chartType === 'time' && styles.controlButtonActive]}
            onPress={() => setChartType('time')}
          >
            <Text style={[styles.controlText, chartType === 'time' && styles.controlTextActive]}>
              Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, chartType === 'distance' && styles.controlButtonActive]}
            onPress={() => setChartType('distance')}
          >
            <Text style={[styles.controlText, chartType === 'distance' && styles.controlTextActive]}>
              Distance
            </Text>
          </TouchableOpacity>
          {enableExport && (
            <TouchableOpacity style={styles.exportButton} onPress={handleExportChart}>
              <Ionicons name="share-outline" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pace Chart */}
      <ViewShot ref={viewShotRef} style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          onDataPointClick={handleDataPointClick}
          withInnerLines
          withOuterLines
          withDots
          bezier
          formatYLabel={(value) => `${parseFloat(value).toFixed(1)}`}
          style={styles.chart}
        />

        {/* Y-axis label */}
        <View style={styles.yAxisLabel}>
          <Text style={styles.yAxisText}>min/km</Text>
        </View>
      </ViewShot>

      {/* Selected data point info */}
      {selectedDataPoint && (
        <View style={styles.dataPointInfo}>
          <Text style={styles.dataPointText}>
            📍 {chartType === 'time' ? formatTime(selectedDataPoint.time) : `${(selectedDataPoint.distance / 1000).toFixed(1)}km`} -
            Pace: {formatPace(selectedDataPoint.pace)}/km
            {selectedDataPoint.elevation > 0 && ` - Elevation: ${Math.round(selectedDataPoint.elevation)}m`}
          </Text>
        </View>
      )}

      {/* Performance Summary */}
      <View style={styles.performanceSummary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Average Pace</Text>
            <Text style={styles.summaryValue}>{formatPace(paceAnalysis.averagePace)}/km</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Consistency</Text>
            <Text style={styles.summaryValue}>±{paceAnalysis.paceConsistency.toFixed(1)}s</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Split Type</Text>
            <Text style={[styles.summaryValue, {
              color: paceAnalysis.positiveNegativeSplit === 'positive' ? '#4CAF50' :
                     paceAnalysis.positiveNegativeSplit === 'negative' ? '#F44336' : '#666'
            }]}>
              {paceAnalysis.positiveNegativeSplit}
            </Text>
          </View>
        </View>
      </View>

      {/* Zone Analysis */}
      {showZoneAnalysis && paceAnalysis.paceZones.zones.length > 0 && (
        <View style={styles.zoneAnalysis}>
          <Text style={styles.sectionTitle}>Pace Zones</Text>
          <View style={styles.zoneContainer}>
            {paceAnalysis.paceZones.zones.map((zone, index) => (
              <View key={index} style={styles.zoneItem}>
                <View style={[styles.zoneColor, { backgroundColor: zone.color }]} />
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zonePercentage}>
                    {paceAnalysis.paceZones.percentageInZones[zone.name]?.toFixed(1) || 0}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Split Table */}
      {showSplitTable && (
        <View style={styles.splitTable}>
          <View style={styles.splitHeader}>
            <Text style={styles.sectionTitle}>Kilometer Splits</Text>
            <TouchableOpacity onPress={() => setShowAnalysisModal(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.splitContainer}>
              {paceAnalysis.splits.slice(0, 10).map((split, index) => (
                <SplitCard
                  key={index}
                  split={split}
                  isFastest={split === paceAnalysis.fastestSplit}
                  isSlowest={split === paceAnalysis.slowestSplit}
                />
              ))}
              {paceAnalysis.splits.length > 10 && (
                <TouchableOpacity
                  style={styles.moreCard}
                  onPress={() => setShowAnalysisModal(true)}
                >
                  <Text style={styles.moreText}>+{paceAnalysis.splits.length - 10}</Text>
                  <Text style={styles.moreSubText}>more</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Export Actions */}
      {enableExport && (
        <View style={styles.exportActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShareAnalysis}>
            <Ionicons name="share-outline" size={16} color="#007AFF" />
            <Text style={styles.actionText}>Share Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyStats}>
            <Ionicons name="copy-outline" size={16} color="#007AFF" />
            <Text style={styles.actionText}>Copy Stats</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detailed Analysis Modal */}
      <Modal
        visible={showAnalysisModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detailed Analysis</Text>
              <TouchableOpacity onPress={() => setShowAnalysisModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* All splits */}
              {paceAnalysis.splits.map((split, index) => (
                <View key={index} style={styles.splitRow}>
                  <Text style={styles.splitKm}>KM {split.kilometer}</Text>
                  <Text style={styles.splitPace}>{formatPace(split.pace)}</Text>
                  <Text style={styles.splitTime}>{formatTime(split.time)}</Text>
                  {split === paceAnalysis.fastestSplit && (
                    <View style={styles.fastestBadge}>
                      <Text style={styles.badgeText}>🚀</Text>
                    </View>
                  )}
                  {split === paceAnalysis.slowestSplit && (
                    <View style={styles.slowestBadge}>
                      <Text style={styles.badgeText}>🐌</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface SplitCardProps {
  split: KilometerSplit;
  isFastest: boolean;
  isSlowest: boolean;
}

const SplitCard: React.FC<SplitCardProps> = ({ split, isFastest, isSlowest }) => {
  const formatPace = (pace: number): string => {
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[
      styles.splitCard,
      isFastest && styles.fastestSplit,
      isSlowest && styles.slowestSplit
    ]}>
      <Text style={styles.splitCardKm}>KM {split.kilometer}</Text>
      <Text style={styles.splitCardPace}>{formatPace(split.pace)}</Text>
      {isFastest && <Text style={styles.splitCardBadge}>🚀</Text>}
      {isSlowest && <Text style={styles.splitCardBadge}>🐌</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  controlButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  controlText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  controlTextActive: {
    color: '#fff',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chartWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  chart: {
    borderRadius: 12,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ rotate: '-90deg' }],
  },
  yAxisText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dataPointInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dataPointText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  performanceSummary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  zoneAnalysis: {
    marginBottom: 16,
  },
  zoneContainer: {
    gap: 8,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  zoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  zoneName: {
    fontSize: 14,
    color: '#333',
  },
  zonePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  splitTable: {
    marginBottom: 16,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  splitContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  splitCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  fastestSplit: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  slowestSplit: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  splitCardKm: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  splitCardPace: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  splitCardBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  moreCard: {
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  moreSubText: {
    fontSize: 12,
    color: '#666',
  },
  exportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  splitKm: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  splitPace: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  splitTime: {
    fontSize: 14,
    color: '#666',
    width: 80,
    textAlign: 'right',
  },
  fastestBadge: {
    marginLeft: 8,
  },
  slowestBadge: {
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
  },
});