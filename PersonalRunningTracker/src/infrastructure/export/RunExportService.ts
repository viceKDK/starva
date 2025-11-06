import { Run } from '@/domain/entities';
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ExportOptions {
  includeRoute?: boolean;
  includeNotes?: boolean;
  format?: 'gpx' | 'tcx' | 'json';
}

export class RunExportService {
  /**
   * Export multiple runs to specified format
   */
  static async exportMultipleRuns(
    runs: Run[],
    format: 'gpx' | 'tcx' | 'json'
  ): Promise<{ success: boolean; uri?: string; error?: string }> {
    if (runs.length === 0) {
      return { success: false, error: 'No runs selected for export' };
    }

    try {
      let content: string;
      let fileName: string;
      let mimeType: string;

      const timestamp = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'gpx':
          content = await this.generateMultipleGPX(runs);
          fileName = `PersonalRunningTracker_${runs.length}_runs_${timestamp}.gpx`;
          mimeType = 'application/gpx+xml';
          break;
        case 'tcx':
          content = await this.generateMultipleTCX(runs);
          fileName = `PersonalRunningTracker_${runs.length}_runs_${timestamp}.tcx`;
          mimeType = 'application/tcx+xml';
          break;
        case 'json':
          content = JSON.stringify({
            export: {
              timestamp: new Date().toISOString(),
              version: '1.0',
              source: 'PersonalRunningTracker',
              count: runs.length
            },
            runs: runs.map(run => ({
              id: run.id,
              name: run.name,
              startTime: run.startTime.toISOString(),
              duration: run.duration,
              distance: run.distance,
              averagePace: run.averagePace,
              route: run.route || [],
              notes: run.notes,
              createdAt: run.createdAt.toISOString()
            }))
          }, null, 2);
          fileName = `PersonalRunningTracker_${runs.length}_runs_${timestamp}.json`;
          mimeType = 'application/json';
          break;
        default:
          return { success: false, error: 'Unsupported export format' };
      }

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Export ${runs.length} Runs`
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
   * Generate GPX content for multiple runs
   */
  private static async generateMultipleGPX(runs: Run[]): Promise<string> {
    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PersonalRunningTracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>PersonalRunningTracker Export - ${runs.length} Runs</name>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

    for (const run of runs) {
      if (run.route && run.route.length > 0) {
        gpxContent += `
  <trk>
    <name>${this.escapeXml(run.name)}</name>
    <type>running</type>
    <trkseg>`;

        for (const point of run.route) {
          gpxContent += `
      <trkpt lat="${point.latitude}" lon="${point.longitude}">
        <time>${point.timestamp.toISOString()}</time>`;
          if (point.altitude !== undefined) {
            gpxContent += `
        <ele>${point.altitude}</ele>`;
          }
          gpxContent += `
      </trkpt>`;
        }

        gpxContent += `
    </trkseg>
  </trk>`;
      }
    }

    gpxContent += `
</gpx>`;
    return gpxContent;
  }

  /**
   * Generate TCX content for multiple runs
   */
  private static async generateMultipleTCX(runs: Run[]): Promise<string> {
    let tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>`;

    for (const run of runs) {
      tcxContent += `
    <Activity Sport="Running">
      <Id>${run.startTime.toISOString()}</Id>
      <Lap StartTime="${run.startTime.toISOString()}">
        <TotalTimeSeconds>${run.duration}</TotalTimeSeconds>
        <DistanceMeters>${run.distance}</DistanceMeters>
        <Calories>0</Calories>
        <AverageHeartRateBpm><Value>0</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>0</Value></MaximumHeartRateBpm>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>`;

      if (run.route && run.route.length > 0) {
        tcxContent += `
        <Track>`;

        for (const point of run.route) {
          tcxContent += `
          <Trackpoint>
            <Time>${point.timestamp.toISOString()}</Time>
            <Position>
              <LatitudeDegrees>${point.latitude}</LatitudeDegrees>
              <LongitudeDegrees>${point.longitude}</LongitudeDegrees>
            </Position>`;
          if (point.altitude !== undefined) {
            tcxContent += `
            <AltitudeMeters>${point.altitude}</AltitudeMeters>`;
          }
          tcxContent += `
          </Trackpoint>`;
        }

        tcxContent += `
        </Track>`;
      }

      tcxContent += `
      </Lap>
      <Notes>${this.escapeXml(run.notes || '')}</Notes>
    </Activity>`;
    }

    tcxContent += `
  </Activities>
</TrainingCenterDatabase>`;
    return tcxContent;
  }

  /**
   * Export run data to GPX format
   */
  static async exportToGPX(run: Run, options: ExportOptions = {}): Promise<string> {
    const { includeRoute = true, includeNotes = true } = options;

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PersonalRunningTracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${this.escapeXml(run.name)}</name>
    <time>${run.startTime.toISOString()}</time>
  </metadata>`;

    if (includeRoute && run.route && run.route.length > 0) {
      gpxContent += `
  <trk>
    <name>${this.escapeXml(run.name)}</name>
    <type>running</type>`;

      if (includeNotes && run.notes) {
        gpxContent += `
    <desc>${this.escapeXml(run.notes)}</desc>`;
      }

      gpxContent += `
    <trkseg>`;

      for (const point of run.route) {
        gpxContent += `
      <trkpt lat="${point.latitude}" lon="${point.longitude}">`;

        if (point.altitude !== undefined) {
          gpxContent += `
        <ele>${point.altitude}</ele>`;
        }

        gpxContent += `
        <time>${point.timestamp.toISOString()}</time>`;

        if (point.accuracy !== undefined) {
          gpxContent += `
        <extensions>
          <accuracy>${point.accuracy}</accuracy>
        </extensions>`;
        }

        gpxContent += `
      </trkpt>`;
      }

      gpxContent += `
    </trkseg>
  </trk>`;
    }

    gpxContent += `
</gpx>`;

    return gpxContent;
  }

  /**
   * Export run data to TCX format
   */
  static async exportToTCX(run: Run, options: ExportOptions = {}): Promise<string> {
    const { includeRoute = true } = options;

    let tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>${run.startTime.toISOString()}</Id>
      <Lap StartTime="${run.startTime.toISOString()}">
        <TotalTimeSeconds>${run.duration}</TotalTimeSeconds>
        <DistanceMeters>${run.distance}</DistanceMeters>
        <Calories>${Math.round((run.distance / 1000) * 60)}</Calories>
        <AverageHeartRateBpm><Value>0</Value></AverageHeartRateBpm>
        <MaximumHeartRateBpm><Value>0</Value></MaximumHeartRateBpm>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>`;

    if (includeRoute && run.route && run.route.length > 0) {
      tcxContent += `
        <Track>`;

      for (const point of run.route) {
        tcxContent += `
          <Trackpoint>
            <Time>${point.timestamp.toISOString()}</Time>
            <Position>
              <LatitudeDegrees>${point.latitude}</LatitudeDegrees>
              <LongitudeDegrees>${point.longitude}</LongitudeDegrees>
            </Position>`;

        if (point.altitude !== undefined) {
          tcxContent += `
            <AltitudeMeters>${point.altitude}</AltitudeMeters>`;
        }

        tcxContent += `
          </Trackpoint>`;
      }

      tcxContent += `
        </Track>`;
    }

    tcxContent += `
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

    return tcxContent;
  }

  /**
   * Export run data to JSON format
   */
  static async exportToJSON(run: Run, options: ExportOptions = {}): Promise<string> {
    const { includeRoute = true, includeNotes = true } = options;

    const exportData = {
      name: run.name,
      startTime: run.startTime.toISOString(),
      endTime: new Date(run.startTime.getTime() + run.duration * 1000).toISOString(),
      duration: run.duration,
      distance: run.distance,
      averagePace: run.averagePace,
      ...(includeNotes && run.notes && { notes: run.notes }),
      ...(includeRoute && run.route && { route: run.route })
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Save and share run data as file
   */
  static async saveAndShareFile(
    run: Run,
    format: 'gpx' | 'tcx' | 'json' = 'gpx',
    options: ExportOptions = {}
  ): Promise<void> {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'gpx':
          content = await this.exportToGPX(run, options);
          filename = `${this.sanitizeFilename(run.name)}_${this.formatDate(run.startTime)}.gpx`;
          mimeType = 'application/gpx+xml';
          break;
        case 'tcx':
          content = await this.exportToTCX(run, options);
          filename = `${this.sanitizeFilename(run.name)}_${this.formatDate(run.startTime)}.tcx`;
          mimeType = 'application/tcx+xml';
          break;
        case 'json':
          content = await this.exportToJSON(run, options);
          filename = `${this.sanitizeFilename(run.name)}_${this.formatDate(run.startTime)}.json`;
          mimeType = 'application/json';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Save to temporary directory
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, content);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Share ${run.name}`
        });
      } else {
        // Fallback to text sharing
        await Share.share({
          message: content,
          title: filename
        });
      }
    } catch (error) {
      console.error('Failed to export and share:', error);
      throw new Error('Failed to export run data');
    }
  }

  /**
   * Share run summary as text
   */
  static async shareRunSummary(run: Run): Promise<void> {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatPace = (secondsPerKm: number): string => {
      if (secondsPerKm === 0 || !isFinite(secondsPerKm)) return '--:--';
      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.floor(secondsPerKm % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const shareText = `🏃‍♂️ ${run.name}

📅 ${run.startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} at ${run.startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}

📏 Distance: ${(run.distance / 1000).toFixed(2)} km
⏱️ Duration: ${formatDuration(run.duration)}
⚡ Average Pace: ${formatPace(run.averagePace)}/km
🔥 Calories: ~${Math.round((run.distance / 1000) * 60)}

${run.notes ? `📝 ${run.notes}\n` : ''}
#running #fitness #PersonalRunningTracker`;

    try {
      await Share.share({
        message: shareText,
        title: run.name
      });
    } catch (error) {
      console.error('Failed to share run summary:', error);
      throw new Error('Failed to share run summary');
    }
  }

  /**
   * Copy run summary to clipboard
   */
  static async copyRunSummary(run: Run): Promise<string> {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatPace = (secondsPerKm: number): string => {
      if (secondsPerKm === 0 || !isFinite(secondsPerKm)) return '--:--';
      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.floor(secondsPerKm % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const summaryText = `${run.name}
Distance: ${(run.distance / 1000).toFixed(2)} km
Duration: ${formatDuration(run.duration)}
Average Pace: ${formatPace(run.averagePace)}/km
Date: ${run.startTime.toLocaleDateString()}`;

    return summaryText;
  }

  /**
   * Helper method to escape XML characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Helper method to sanitize filename
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  /**
   * Helper method to format date for filename
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}