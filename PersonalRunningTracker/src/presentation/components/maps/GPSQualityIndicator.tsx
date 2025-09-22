import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { GPSPoint } from '@/domain/entities';
import { GPSQualityAnalyzer, GPSQualityMetrics } from '@/infrastructure/maps/GPSQualityAnalyzer';

interface GPSQualityIndicatorProps {
  points: GPSPoint[];
  showDetails?: boolean;
}

export const GPSQualityIndicator: React.FC<GPSQualityIndicatorProps> = ({
  points,
  showDetails = false
}) => {
  const [detailsVisible, setDetailsVisible] = useState(false);

  const qualityMetrics = useMemo(() => {
    return GPSQualityAnalyzer.analyzeRouteQuality(points);
  }, [points]);

  const qualityAssessment = useMemo(() => {
    return GPSQualityAnalyzer.getQualityAssessment(qualityMetrics);
  }, [qualityMetrics]);

  const recommendations = useMemo(() => {
    return GPSQualityAnalyzer.getQualityRecommendations(qualityMetrics);
  }, [qualityMetrics]);

  const getQualityColor = (score: number): string => {
    if (score >= 90) return '#4CAF50';
    if (score >= 80) return '#8BC34A';
    if (score >= 70) return '#FFC107';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getSignalStrengthIcon = (score: number): string => {
    if (score >= 90) return '📶';
    if (score >= 80) return '📶';
    if (score >= 70) return '📶';
    if (score >= 60) return '📵';
    return '📵';
  };

  if (points.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.indicator, { backgroundColor: getQualityColor(qualityMetrics.qualityScore) }]}
        onPress={() => showDetails && setDetailsVisible(true)}
      >
        <Text style={styles.iconText}>{getSignalStrengthIcon(qualityMetrics.qualityScore)}</Text>
        <Text style={styles.scoreText}>{qualityMetrics.qualityScore}</Text>
      </TouchableOpacity>

      {showDetails && (
        <Modal
          visible={detailsVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>GPS Quality Report</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setDetailsVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Overall Quality */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Overall Quality</Text>
                  <View style={styles.qualityBadge}>
                    <View style={[styles.qualityDot, { backgroundColor: getQualityColor(qualityMetrics.qualityScore) }]} />
                    <Text style={styles.qualityText}>
                      {qualityAssessment} ({qualityMetrics.qualityScore}/100)
                    </Text>
                  </View>
                </View>

                {/* Detailed Metrics */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Detailed Metrics</Text>
                  <View style={styles.metricsList}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Total GPS Points:</Text>
                      <Text style={styles.metricValue}>{qualityMetrics.totalPoints.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Filtered Points:</Text>
                      <Text style={styles.metricValue}>{qualityMetrics.filteredPoints.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Average Accuracy:</Text>
                      <Text style={styles.metricValue}>±{qualityMetrics.averageAccuracy}m</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Poor Accuracy (>50m):</Text>
                      <Text style={styles.metricValue}>{qualityMetrics.poorAccuracyPercentage.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Signal Loss Gaps:</Text>
                      <Text style={styles.metricValue}>{qualityMetrics.signalLossGaps.length}</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Outlier Points:</Text>
                      <Text style={styles.metricValue}>{qualityMetrics.outlierCount}</Text>
                    </View>
                  </View>
                </View>

                {/* Signal Loss Gaps */}
                {qualityMetrics.signalLossGaps.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Signal Loss Periods</Text>
                    {qualityMetrics.signalLossGaps.map((gap, index) => (
                      <View key={index} style={styles.gapItem}>
                        <Text style={styles.gapDuration}>
                          {Math.round(gap.durationSeconds)}s gap
                        </Text>
                        <Text style={styles.gapDistance}>
                          ~{Math.round(gap.estimatedDistance)}m estimated
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                  {recommendations.map((recommendation, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.recommendationText}>{recommendation}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  indicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  iconText: {
    fontSize: 12,
    marginRight: 4,
  },
  scoreText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  qualityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricsList: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  gapItem: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ffc107',
  },
  gapDuration: {
    fontSize: 14,
    fontWeight: '500',
    color: '#856404',
  },
  gapDistance: {
    fontSize: 12,
    color: '#856404',
    marginTop: 2,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 1,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});