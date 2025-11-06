import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PaceAnalysis, KilometerSplit, PaceDataPoint } from '@/application/services/PaceAnalysisService';

export interface PaceExportOptions {
  includeElevation?: boolean;
  includeZoneAnalysis?: boolean;
  format?: 'json' | 'csv' | 'text';
}

export interface SharePaceOptions {
  includeHighlights?: boolean;
  includeComparison?: boolean;
  format?: 'summary' | 'detailed';
}

export class PaceExportService {
  /**
   * Export pace analysis data to file
   */
  static async exportPaceAnalysis(
    paceAnalysis: PaceAnalysis,
    runName: string,
    options: PaceExportOptions = {}
  ): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      const { format = 'json', includeElevation = true, includeZoneAnalysis = true } = options;

      let content: string;
      let fileName: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          content = this.generateCSVContent(paceAnalysis, includeElevation);
          fileName = `${runName}_pace_analysis.csv`;
          mimeType = 'text/csv';
          break;
        case 'text':
          content = this.generateTextContent(paceAnalysis, includeElevation, includeZoneAnalysis);
          fileName = `${runName}_pace_analysis.txt`;
          mimeType = 'text/plain';
          break;
        default:
          content = this.generateJSONContent(paceAnalysis, includeElevation, includeZoneAnalysis);
          fileName = `${runName}_pace_analysis.json`;
          mimeType = 'application/json';
      }

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Export ${runName} Pace Analysis`
        });
      }

      return { success: true, uri: fileUri };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Share pace analysis summary
   */
  static async sharePaceAnalysis(
    paceAnalysis: PaceAnalysis,
    runName: string,
    options: SharePaceOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { format = 'summary', includeHighlights = true, includeComparison = true } = options;

      const content = format === 'detailed'
        ? this.generateDetailedShareContent(paceAnalysis, runName, includeHighlights, includeComparison)
        : this.generateSummaryShareContent(paceAnalysis, runName, includeHighlights);

      await Share.share({
        message: content,
        title: `${runName} - Pace Analysis`
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Share failed'
      };
    }
  }

  /**
   * Export split data to CSV format
   */
  static async exportSplitData(
    splits: KilometerSplit[],
    runName: string
  ): Promise<{ success: boolean; uri?: string; error?: string }> {
    try {
      const csvContent = this.generateSplitCSV(splits);
      const fileName = `${runName}_splits.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${runName} Split Data`
        });
      }

      return { success: true, uri: fileUri };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Split export failed'
      };
    }
  }

  /**
   * Generate JSON content for pace analysis
   */
  private static generateJSONContent(
    paceAnalysis: PaceAnalysis,
    includeElevation: boolean,
    includeZoneAnalysis: boolean
  ): string {
    const exportData: any = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        source: 'PersonalRunningTracker'
      },
      averagePace: paceAnalysis.averagePace,
      paceConsistency: paceAnalysis.paceConsistency,
      positiveNegativeSplit: paceAnalysis.positiveNegativeSplit,
      splits: paceAnalysis.splits.map(split => ({
        kilometer: split.kilometer,
        pace: split.pace,
        time: split.time,
        distance: split.distance,
        ...(includeElevation && {
          elevationGain: split.elevationGain,
          elevationLoss: split.elevationLoss
        })
      })),
      fastestSplit: paceAnalysis.fastestSplit,
      slowestSplit: paceAnalysis.slowestSplit,
      performanceMetrics: paceAnalysis.performanceMetrics
    };

    if (includeZoneAnalysis) {
      exportData.paceZones = paceAnalysis.paceZones;
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate CSV content for pace analysis
   */
  private static generateCSVContent(paceAnalysis: PaceAnalysis, includeElevation: boolean): string {
    const headers = [
      'Kilometer',
      'Pace (min/km)',
      'Time (seconds)',
      'Distance (meters)',
      ...(includeElevation ? ['Elevation Gain (m)', 'Elevation Loss (m)'] : [])
    ];

    const rows = paceAnalysis.splits.map(split => {
      const pace = `${Math.floor(split.pace / 60)}:${(split.pace % 60).toFixed(0).padStart(2, '0')}`;
      const row = [
        split.kilometer.toString(),
        pace,
        split.time.toFixed(1),
        split.distance.toFixed(1),
        ...(includeElevation ? [
          split.elevationGain.toFixed(1),
          split.elevationLoss.toFixed(1)
        ] : [])
      ];
      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate readable text content for pace analysis
   */
  private static generateTextContent(
    paceAnalysis: PaceAnalysis,
    includeElevation: boolean,
    includeZoneAnalysis: boolean
  ): string {
    const formatPace = (pace: number) =>
      `${Math.floor(pace / 60)}:${(pace % 60).toFixed(0).padStart(2, '0')}`;

    let content = `PACE ANALYSIS REPORT\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;

    content += `SUMMARY\n`;
    content += `Average Pace: ${formatPace(paceAnalysis.averagePace)}/km\n`;
    content += `Pace Consistency: ±${paceAnalysis.paceConsistency.toFixed(1)}s\n`;
    content += `Split Strategy: ${paceAnalysis.positiveNegativeSplit}\n\n`;

    if (paceAnalysis.fastestSplit) {
      content += `Fastest Split: KM ${paceAnalysis.fastestSplit.kilometer} - ${formatPace(paceAnalysis.fastestSplit.pace)}/km\n`;
    }
    if (paceAnalysis.slowestSplit) {
      content += `Slowest Split: KM ${paceAnalysis.slowestSplit.kilometer} - ${formatPace(paceAnalysis.slowestSplit.pace)}/km\n\n`;
    }

    content += `KILOMETER SPLITS\n`;
    content += `KM\tPace\t\tTime\t\tDistance`;
    if (includeElevation) {
      content += `\tElev +/-`;
    }
    content += `\n`;

    paceAnalysis.splits.forEach(split => {
      const timeFormatted = `${Math.floor(split.time / 60)}:${(split.time % 60).toFixed(0).padStart(2, '0')}`;
      content += `${split.kilometer}\t${formatPace(split.pace)}/km\t${timeFormatted}\t\t${(split.distance / 1000).toFixed(3)}km`;
      if (includeElevation) {
        content += `\t+${split.elevationGain.toFixed(0)}/-${split.elevationLoss.toFixed(0)}m`;
      }
      content += `\n`;
    });

    if (includeZoneAnalysis && paceAnalysis.paceZones.zones.length > 0) {
      content += `\nPACE ZONE DISTRIBUTION\n`;
      paceAnalysis.paceZones.zones.forEach(zone => {
        const percentage = paceAnalysis.paceZones.percentageInZones[zone.name] || 0;
        content += `${zone.name}: ${percentage.toFixed(1)}%\n`;
      });
    }

    return content;
  }

  /**
   * Generate CSV for split data
   */
  private static generateSplitCSV(splits: KilometerSplit[]): string {
    const headers = [
      'Kilometer',
      'Pace (seconds/km)',
      'Pace (min:sec/km)',
      'Time (seconds)',
      'Distance (meters)',
      'Elevation Gain (m)',
      'Elevation Loss (m)'
    ];

    const rows = splits.map(split => {
      const paceFormatted = `${Math.floor(split.pace / 60)}:${(split.pace % 60).toFixed(0).padStart(2, '0')}`;
      return [
        split.kilometer,
        split.pace.toFixed(1),
        paceFormatted,
        split.time.toFixed(1),
        split.distance.toFixed(1),
        split.elevationGain.toFixed(1),
        split.elevationLoss.toFixed(1)
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate summary share content
   */
  private static generateSummaryShareContent(
    paceAnalysis: PaceAnalysis,
    runName: string,
    includeHighlights: boolean
  ): string {
    const formatPace = (pace: number) =>
      `${Math.floor(pace / 60)}:${(pace % 60).toFixed(0).padStart(2, '0')}`;

    let content = `🏃‍♂️ ${runName} - Pace Analysis\n\n`;
    content += `📊 Average Pace: ${formatPace(paceAnalysis.averagePace)}/km\n`;
    content += `🎯 Consistency: ±${paceAnalysis.paceConsistency.toFixed(1)}s\n`;
    content += `📈 Strategy: ${paceAnalysis.positiveNegativeSplit} split\n`;

    if (includeHighlights && paceAnalysis.fastestSplit && paceAnalysis.slowestSplit) {
      content += `\n🚀 Fastest: KM ${paceAnalysis.fastestSplit.kilometer} (${formatPace(paceAnalysis.fastestSplit.pace)}/km)\n`;
      content += `🐌 Slowest: KM ${paceAnalysis.slowestSplit.kilometer} (${formatPace(paceAnalysis.slowestSplit.pace)}/km)\n`;
    }

    content += `\n💪 Generated by PersonalRunningTracker`;
    return content;
  }

  /**
   * Generate detailed share content
   */
  private static generateDetailedShareContent(
    paceAnalysis: PaceAnalysis,
    runName: string,
    includeHighlights: boolean,
    includeComparison: boolean
  ): string {
    const formatPace = (pace: number) =>
      `${Math.floor(pace / 60)}:${(pace % 60).toFixed(0).padStart(2, '0')}`;

    let content = this.generateSummaryShareContent(paceAnalysis, runName, includeHighlights);

    content += `\n\n📋 Split Details:\n`;
    paceAnalysis.splits.forEach((split, index) => {
      const comparison = includeComparison ?
        ` (${split.pace > paceAnalysis.averagePace ? '+' : ''}${(split.pace - paceAnalysis.averagePace).toFixed(0)}s)` : '';
      content += `KM ${split.kilometer}: ${formatPace(split.pace)}/km${comparison}\n`;
    });

    return content;
  }
}