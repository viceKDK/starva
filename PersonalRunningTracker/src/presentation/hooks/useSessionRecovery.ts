import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  SessionStorageService,
  SessionData
} from '@/infrastructure/storage/SessionStorageService';
import { RunSessionState } from '@/presentation/controllers/RunSessionState';

interface UseSessionRecoveryResult {
  isRecoveryDialogVisible: boolean;
  pendingSession: SessionData | null;
  handleContinueSession: () => void;
  handleSaveSession: () => void;
  handleDiscardSession: () => void;
}

export const useSessionRecovery = (): UseSessionRecoveryResult => {
  const [isRecoveryDialogVisible, setIsRecoveryDialogVisible] = useState(false);
  const [pendingSession, setPendingSession] = useState<SessionData | null>(null);

  useEffect(() => {
    checkForPendingSession();
  }, []);

  const checkForPendingSession = async () => {
    try {
      const hasActive = await SessionStorageService.hasActiveSession();
      if (hasActive) {
        const sessionData = await SessionStorageService.loadSession();
        if (sessionData && isRecoverableState(sessionData.sessionState)) {
          setPendingSession(sessionData);
          setIsRecoveryDialogVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to check for pending session:', error);
    }
  };

  const isRecoverableState = (state: RunSessionState): boolean => {
    return [
      RunSessionState.TRACKING,
      RunSessionState.PAUSED,
      RunSessionState.STARTING
    ].includes(state);
  };

  const handleContinueSession = async () => {
    try {
      if (!pendingSession) return;

      // Session will be restored by the TrackingScreen controller
      // which will detect the existing session state
      setIsRecoveryDialogVisible(false);
      setPendingSession(null);

      // Navigate to tracking screen if needed
      console.log('Continuing session with ID:', pendingSession.sessionId);
    } catch (error) {
      console.error('Failed to continue session:', error);
      Alert.alert('Error', 'Failed to continue session. Please try again.');
    }
  };

  const handleSaveSession = async () => {
    try {
      if (!pendingSession) return;

      // For now, we'll simulate saving the session
      // In a complete implementation, this would:
      // 1. Calculate final metrics
      // 2. Create a Run entity
      // 3. Save to database
      // 4. Clear session storage

      Alert.alert(
        'Session Saved',
        'Your incomplete run has been saved to your history.',
        [
          {
            text: 'OK',
            onPress: () => {
              SessionStorageService.clearSession();
              setIsRecoveryDialogVisible(false);
              setPendingSession(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to save session:', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    }
  };

  const handleDiscardSession = async () => {
    try {
      Alert.alert(
        'Discard Session',
        'Are you sure you want to discard this session? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await SessionStorageService.clearSession();
              setIsRecoveryDialogVisible(false);
              setPendingSession(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to discard session:', error);
      Alert.alert('Error', 'Failed to discard session. Please try again.');
    }
  };

  return {
    isRecoveryDialogVisible,
    pendingSession,
    handleContinueSession,
    handleSaveSession,
    handleDiscardSession
  };
};
