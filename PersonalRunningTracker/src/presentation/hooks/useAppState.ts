import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SessionStorageService } from '@/infrastructure/storage/SessionStorageService';

interface UseAppStateOptions {
  onBackground?: () => void;
  onForeground?: () => void;
  autoSaveOnBackground?: boolean;
  sessionData?: any;
}

export const useAppState = (options: UseAppStateOptions = {}) => {
  const {
    onBackground,
    onForeground,
    autoSaveOnBackground = false,
    sessionData
  } = options;

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App is going to background
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('App is going to background');

        // Auto-save session if enabled and session data exists
        if (autoSaveOnBackground && sessionData) {
          try {
            await SessionStorageService.saveSession(sessionData);
            console.log('Session auto-saved on background');
          } catch (error) {
            console.error('Failed to auto-save session on background:', error);
          }
        }

        // Call custom background handler
        onBackground?.();
      }

      // App is coming to foreground
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App is coming to foreground');

        // Call custom foreground handler
        onForeground?.();
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [onBackground, onForeground, autoSaveOnBackground, sessionData]);

  return {
    currentAppState: appStateRef.current
  };
};