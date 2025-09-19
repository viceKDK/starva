import AsyncStorage from '@react-native-async-storage/async-storage';
import { GPSPoint } from '@/domain/entities';
import { RunSessionState } from '@/presentation/controllers/RunSessionState';

export interface SessionData {
  sessionState: RunSessionState;
  startTime: string | null; // ISO string
  pausedTime: number; // Total paused time in seconds
  lastPauseStart: string | null; // ISO string
  trackingPoints: GPSPoint[];
  sessionId: string;
}

export class SessionStorageService {
  private static readonly SESSION_KEY = 'run_tracking_session';

  public static async saveSession(sessionData: SessionData): Promise<void> {
    try {
      const serializedData = JSON.stringify({
        ...sessionData,
        trackingPoints: sessionData.trackingPoints.map(point => ({
          ...point,
          timestamp: point.timestamp.toISOString()
        }))
      });

      await AsyncStorage.setItem(this.SESSION_KEY, serializedData);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  public static async loadSession(): Promise<SessionData | null> {
    try {
      const serializedData = await AsyncStorage.getItem(this.SESSION_KEY);
      if (!serializedData) {
        return null;
      }

      const data = JSON.parse(serializedData);

      // Deserialize GPS points with proper Date objects
      const trackingPoints: GPSPoint[] = data.trackingPoints.map((point: any) => ({
        ...point,
        timestamp: new Date(point.timestamp)
      }));

      return {
        ...data,
        trackingPoints
      };
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  public static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  public static async hasActiveSession(): Promise<boolean> {
    try {
      const sessionData = await this.loadSession();
      if (!sessionData) {
        return false;
      }

      // Check if session is in an active state
      const activeStates = [
        RunSessionState.TRACKING,
        RunSessionState.PAUSED,
        RunSessionState.STARTING,
        RunSessionState.STOPPING
      ];

      return activeStates.includes(sessionData.sessionState);
    } catch (error) {
      console.error('Failed to check active session:', error);
      return false;
    }
  }
}
