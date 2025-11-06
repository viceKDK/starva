import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  KilometerSplit,
  PaceAnalysis
} from '@/application/services/PaceAnalysisService';
import { PaceExportService } from '@/infrastructure/export/PaceExportService';

export interface SplitAnalysisTableProps {
  paceAnalysis: PaceAnalysis;
  showElevation?: boolean;
  showCumulativeTime?: boolean;
  maxVisibleSplits?: number;
  runName?: string;
  enableExport?: boolean;
}

export const SplitAnalysisTable: React.FC<SplitAnalysisTableProps> = ({
  paceAnalysis,
  showElevation = true,
  showCumulativeTime = true,
  maxVisibleSplits = 5,
  runName = 'Run',
  enableExport = true
}) => {
  const [showAllSplits, setShowAllSplits] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<KilometerSplit | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate cumulative times
  const splitsWithCumulative = useMemo(() => {
    let cumulativeTime = 0;
    return paceAnalysis.splits.map(split => {
      cumulativeTime += split.time;
      return {
        ...split,
        cumulativeTime
      };
    });
  }, [paceAnalysis.splits]);

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

  const getPaceZoneColor = (pace: number): string => {
    const averagePace = paceAnalysis.averagePace;

    if (pace <= averagePace - 90) return '#F44336'; // Maximum effort - Red
    if (pace <= averagePace - 30) return '#FF9800'; // Hard - Orange
    if (pace <= averagePace + 60) return '#FFC107'; // Moderate - Yellow
    return '#4CAF50'; // Easy - Green
  };

  const getSplitComparison = (split: KilometerSplit): string => {
    const diff = split.pace - paceAnalysis.averagePace;
    if (Math.abs(diff) < 5) return ''; // Within 5 seconds

    const sign = diff > 0 ? '+' : '';
    return `${sign}${Math.round(diff)}s`;
  };

  const handleExportData = async (format: 'json' | 'csv' | 'text') => {
    setIsExporting(true);
    try {
      const result = await PaceExportService.exportPaceAnalysis(paceAnalysis, runName, {
        format,
        includeElevation: showElevation,
        includeZoneAnalysis: true
      });

      if (result.success) {
        Alert.alert('Export Success', `Pace analysis exported successfully!`);
      } else {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export pace analysis');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const handleShareSummary = async () => {
    setIsExporting(true);
    try {
      const result = await PaceExportService.sharePaceAnalysis(paceAnalysis, runName, {
        format: 'summary',
        includeHighlights: true,
        includeComparison: true
      });

      if (!result.success) {
        Alert.alert('Share Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Share Failed', 'Failed to share pace analysis');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const handleShareDetailed = async () => {
    setIsExporting(true);
    try {
      const result = await PaceExportService.sharePaceAnalysis(paceAnalysis, runName, {
        format: 'detailed',
        includeHighlights: true,
        includeComparison: true
      });

      if (!result.success) {
        Alert.alert('Share Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Share Failed', 'Failed to share pace analysis');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const handleExportSplits = async () => {
    setIsExporting(true);
    try {
      const result = await PaceExportService.exportSplitData(paceAnalysis.splits, runName);

      if (result.success) {
        Alert.alert('Export Success', 'Split data exported successfully!');
      } else {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Failed to export split data');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  const visibleSplits = showAllSplits
    ? splitsWithCumulative
    : splitsWithCumulative.slice(0, maxVisibleSplits);

  if (paceAnalysis.splits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Split Analysis</Text>
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No split data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Split Analysis</Text>
        <View style={styles.headerButtons}>
          {paceAnalysis.splits.length > maxVisibleSplits && (
            <TouchableOpacity onPress={() => setShowAllSplits(!showAllSplits)}>
              <Text style={styles.toggleText}>
                {showAllSplits ? 'Show Less' : `Show All ${paceAnalysis.splits.length}`}
              </Text>
            </TouchableOpacity>
          )}
          {enableExport && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => setShowExportModal(true)}
            >
              <Ionicons name="share-outline" size={16} color="#007AFF" />
              <Text style={styles.exportText}>Export</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Performance Highlights */}
      <View style={styles.highlights}>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightLabel}>Fastest Split</Text>
          <Text style={styles.highlightValue}>
            {paceAnalysis.fastestSplit
              ? `KM ${paceAnalysis.fastestSplit.kilometer} - ${formatPace(paceAnalysis.fastestSplit.pace)}/km`
              : 'N/A'
            }
          </Text>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightLabel}>Slowest Split</Text>
          <Text style={styles.highlightValue}>
            {paceAnalysis.slowestSplit
              ? `KM ${paceAnalysis.slowestSplit.kilometer} - ${formatPace(paceAnalysis.slowestSplit.pace)}/km`
              : 'N/A'
            }
          </Text>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightLabel}>Consistency</Text>
          <Text style={styles.highlightValue}>
            ±{paceAnalysis.paceConsistency.toFixed(1)}s
          </Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.kmColumn]}>KM</Text>
        <Text style={[styles.headerCell, styles.paceColumn]}>Pace</Text>
        <Text style={[styles.headerCell, styles.timeColumn]}>Time</Text>
        {showCumulativeTime && (
          <Text style={[styles.headerCell, styles.cumulativeColumn]}>Total</Text>
        )}
        <Text style={[styles.headerCell, styles.compareColumn]}>Δ</Text>
        {showElevation && (
          <Text style={[styles.headerCell, styles.elevationColumn]}>↗↘</Text>
        )}
      </View>

      {/* Table Rows */}
      <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
        {visibleSplits.map((split, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.tableRow,
              split === paceAnalysis.fastestSplit && styles.fastestRow,
              split === paceAnalysis.slowestSplit && styles.slowestRow
            ]}
            onPress={() => setSelectedSplit(split)}
          >
            {/* Zone color indicator */}
            <View style={[
              styles.zoneIndicator,
              { backgroundColor: getPaceZoneColor(split.pace) }
            ]} />

            <Text style={[styles.cell, styles.kmColumn]}>{split.kilometer}</Text>

            <Text style={[styles.cell, styles.paceColumn, styles.paceText]}>
              {formatPace(split.pace)}
            </Text>

            <Text style={[styles.cell, styles.timeColumn]}>
              {formatTime(split.time)}
            </Text>

            {showCumulativeTime && (
              <Text style={[styles.cell, styles.cumulativeColumn]}>
                {formatTime(split.cumulativeTime)}
              </Text>
            )}

            <Text style={[
              styles.cell,
              styles.compareColumn,
              {
                color: split.pace < paceAnalysis.averagePace ? '#4CAF50' :
                       split.pace > paceAnalysis.averagePace ? '#F44336' : '#666'
              }
            ]}>
              {getSplitComparison(split)}
            </Text>

            {showElevation && (
              <View style={[styles.cell]}>
                {split.elevationGain > 5 && (
                  <Text style={styles.elevationGain}>+{Math.round(split.elevationGain)}</Text>
                )}
                {split.elevationLoss > 5 && (
                  <Text style={styles.elevationLoss}>-{Math.round(split.elevationLoss)}</Text>
                )}
              </View>
            )}

            {/* Performance indicators */}
            {split === paceAnalysis.fastestSplit && (
              <View style={styles.performanceIndicator}>
                <Text style={styles.fastestIcon}>🚀</Text>
              </View>
            )}
            {split === paceAnalysis.slowestSplit && (
              <View style={styles.performanceIndicator}>
                <Text style={styles.slowestIcon}>🐌</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Zone Colors:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Easy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Hard</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Max</Text>
          </View>
        </View>
      </View>

      {/* Split Detail Modal */}
      <Modal
        visible={selectedSplit !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSplit(null)}
      >
        {selectedSplit && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kilometer {selectedSplit.kilometer} Details</Text>
                <TouchableOpacity onPress={() => setSelectedSplit(null)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pace:</Text>
                  <Text style={styles.detailValue}>{formatPace(selectedSplit.pace)}/km</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>{formatTime(selectedSplit.time)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>{(selectedSplit.distance / 1000).toFixed(3)} km</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>vs Average:</Text>
                  <Text style={[
                    styles.detailValue,
                    {
                      color: selectedSplit.pace < paceAnalysis.averagePace ? '#4CAF50' :
                             selectedSplit.pace > paceAnalysis.averagePace ? '#F44336' : '#666'
                    }
                  ]}>
                    {getSplitComparison(selectedSplit)}
                  </Text>
                </View>
                {showElevation && (selectedSplit.elevationGain > 0 || selectedSplit.elevationLoss > 0) && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Elevation Gain:</Text>
                      <Text style={styles.detailValue}>+{Math.round(selectedSplit.elevationGain)}m</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Elevation Loss:</Text>
                      <Text style={styles.detailValue}>-{Math.round(selectedSplit.elevationLoss)}m</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Export Options Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Pace Analysis</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.exportModalBody}>
              <Text style={styles.exportSectionTitle}>Share Options</Text>
              <TouchableOpacity
                style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
                onPress={handleShareSummary}
                disabled={isExporting}
              >
                <Ionicons name="share-social-outline" size={20} color="#007AFF" />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Share Summary</Text>
                  <Text style={styles.exportOptionDescription}>Quick overview with key metrics</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
                onPress={handleShareDetailed}
                disabled={isExporting}
              >
                <Ionicons name="list-outline" size={20} color="#007AFF" />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Share Detailed</Text>
                  <Text style={styles.exportOptionDescription}>Complete analysis with all splits</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.exportSectionTitle}>Export Files</Text>
              <TouchableOpacity
                style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
                onPress={() => handleExportData('json')}
                disabled={isExporting}
              >
                <Ionicons name="code-outline" size={20} color="#FF9500" />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Export JSON</Text>
                  <Text style={styles.exportOptionDescription}>Structured data format</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
                onPress={() => handleExportData('csv')}
                disabled={isExporting}
              >
                <Ionicons name="grid-outline" size={20} color="#34C759" />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Export CSV</Text>
                  <Text style={styles.exportOptionDescription}>Spreadsheet compatible format</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
                onPress={() => handleExportData('text')}
                disabled={isExporting}
              >
                <Ionicons name="document-text-outline" size={20} color="#5856D6" />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Export Text</Text>
                  <Text style={styles.exportOptionDescription}>Human-readable report</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportOption, isExporting && styles.exportOptionDisabled]}
                onPress={handleExportSplits}
                disabled={isExporting}
              >
                <Ionicons name="analytics-outline" size={20} color="#FF3B30" />
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>Export Split Data</Text>
                  <Text style={styles.exportOptionDescription}>Raw split times and metrics</Text>
                </View>
              </TouchableOpacity>

              {isExporting && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Exporting...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  toggleText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  exportText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  highlights: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  highlightItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  tableBody: {
    maxHeight: 200,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  fastestRow: {
    backgroundColor: '#e8f5e8',
  },
  slowestRow: {
    backgroundColor: '#ffebee',
  },
  zoneIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    borderRadius: 2,
  },
  cell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  kmColumn: {
    width: 40,
  },
  paceColumn: {
    width: 70,
  },
  timeColumn: {
    width: 60,
  },
  cumulativeColumn: {
    width: 70,
  },
  compareColumn: {
    width: 50,
  },
  elevationColumn: {
    width: 50,
    alignItems: 'center',
  },
  paceText: {
    fontWeight: '600',
  },
  elevationGain: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  elevationLoss: {
    fontSize: 10,
    color: '#F44336',
    fontWeight: '600',
  },
  performanceIndicator: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  fastestIcon: {
    fontSize: 16,
  },
  slowestIcon: {
    fontSize: 16,
  },
  legend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    width: '80%',
    maxWidth: 300,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  exportModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  exportModalBody: {
    padding: 20,
  },
  exportSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  exportOptionDisabled: {
    opacity: 0.5,
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  exportOptionDescription: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});