import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GPSPoint } from '@/domain/entities';
import { GPSQualityAnalyzer, GPSQualityMetrics } from '@/infrastructure/maps/GPSQualityAnalyzer';

interface GPSDataQualityCardProps {
  points: GPSPoint[];
  onViewDetails?: () => void;
}

export const GPSDataQualityCard: React.FC<GPSDataQualityCardProps> = ({
  points,
  onViewDetails
}) => {
  const qualityMetrics = useMemo(() => {
    return GPSQualityAnalyzer.analyzeRouteQuality(points);
  }, [points]);

  const getQualityColor = (score: number): string => {
    if (score >= 90) return '#4CAF50';
    if (score >= 80) return '#8BC34A';
    if (score >= 70) return '#FFC107';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getQualityText = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Very Poor';
  };

  const formatSignalLossTime = (metrics: GPSQualityMetrics): string => {
    const totalLossTime = metrics.signalLossGaps.reduce((sum, gap) => sum + gap.durationSeconds, 0);
    if (totalLossTime === 0) return 'None';

    const minutes = Math.floor(totalLossTime / 60);
    const seconds = totalLossTime % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (points.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GPS Data Quality</Text>
        <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(qualityMetrics.qualityScore) }]}>
          <Text style={styles.qualityScore}>{qualityMetrics.qualityScore}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.metric}>
            <Ionicons name="radio-outline" size={20} color="#666" />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Quality</Text>
              <Text style={styles.metricValue}>{getQualityText(qualityMetrics.qualityScore)}</Text>
            </View>
          </View>
          <View style={styles.metric}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Avg Accuracy</Text>
              <Text style={styles.metricValue}>±{qualityMetrics.averageAccuracy}m</Text>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.metric}>
            <Ionicons name="analytics-outline" size={20} color="#666" />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>GPS Points</Text>
              <Text style={styles.metricValue}>{qualityMetrics.totalPoints.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.metric}>
            <Ionicons name="warning-outline" size={20} color="#666" />
            <View style={styles.metricInfo}>
              <Text style={styles.metricLabel}>Signal Loss</Text>
              <Text style={styles.metricValue}>{formatSignalLossTime(qualityMetrics)}</Text>
            </View>
          </View>
        </View>

        {qualityMetrics.poorAccuracyPercentage > 10 && (
          <View style={styles.warningContainer}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF9800" />
            <Text style={styles.warningText}>
              {qualityMetrics.poorAccuracyPercentage.toFixed(1)}% of points had poor accuracy (&gt;50m)
            </Text>
          </View>
        )}

        {qualityMetrics.signalLossGaps.length > 0 && (
          <View style={styles.warningContainer}>
            <Ionicons name="wifi-outline" size={16} color="#F44336" />
            <Text style={styles.warningText}>
              {qualityMetrics.signalLossGaps.length} signal loss period{qualityMetrics.signalLossGaps.length > 1 ? 's' : ''} detected
            </Text>
          </View>
        )}

        {onViewDetails && (
          <TouchableOpacity style={styles.viewDetailsButton} onPress={onViewDetails}>
            <Text style={styles.viewDetailsText}>View Detailed Analysis</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  qualityScore: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  metricInfo: {
    marginLeft: 8,
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 6,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
});