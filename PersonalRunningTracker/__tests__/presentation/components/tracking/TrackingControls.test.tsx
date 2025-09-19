import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TrackingControls } from '../../../../src/presentation/components/tracking/TrackingControls';
import { RunSessionState } from '../../../../src/presentation/controllers/RunSessionState';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  }
}));

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn()
    }
  };
});

describe('TrackingControls', () => {
  const mockProps = {
    sessionState: RunSessionState.READY,
    isLoading: false,
    onStart: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStop: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Ready State', () => {
    it('should render start button when ready', () => {
      const { getByLabelText } = render(
        <TrackingControls {...mockProps} />
      );

      const startButton = getByLabelText('Start run tracking');
      expect(startButton).toBeTruthy();
    });

    it('should call onStart when start button is pressed', async () => {
      const { getByLabelText } = render(
        <TrackingControls {...mockProps} />
      );

      const startButton = getByLabelText('Start run tracking');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(mockProps.onStart).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable start button when loading', () => {
      const { getByLabelText } = render(
        <TrackingControls {...mockProps} isLoading={true} />
      );

      const startButton = getByLabelText('Start run tracking');
      expect(startButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Tracking State', () => {
    it('should render pause and stop buttons when tracking', () => {
      const { getByLabelText } = render(
        <TrackingControls
          {...mockProps}
          sessionState={RunSessionState.TRACKING}
        />
      );

      const pauseButton = getByLabelText('Pause run tracking');
      const stopButton = getByLabelText('Stop run tracking');

      expect(pauseButton).toBeTruthy();
      expect(stopButton).toBeTruthy();
    });

    it('should call onPause when pause button is pressed', async () => {
      const { getByLabelText } = render(
        <TrackingControls
          {...mockProps}
          sessionState={RunSessionState.TRACKING}
        />
      );

      const pauseButton = getByLabelText('Pause run tracking');
      fireEvent.press(pauseButton);

      await waitFor(() => {
        expect(mockProps.onPause).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Paused State', () => {
    it('should render resume and stop buttons when paused', () => {
      const { getByLabelText } = render(
        <TrackingControls
          {...mockProps}
          sessionState={RunSessionState.PAUSED}
        />
      );

      const resumeButton = getByLabelText('Resume run tracking');
      const stopButton = getByLabelText('Stop run tracking');

      expect(resumeButton).toBeTruthy();
      expect(stopButton).toBeTruthy();
    });

    it('should call onResume when resume button is pressed', async () => {
      const { getByLabelText } = render(
        <TrackingControls
          {...mockProps}
          sessionState={RunSessionState.PAUSED}
        />
      );

      const resumeButton = getByLabelText('Resume run tracking');
      fireEvent.press(resumeButton);

      await waitFor(() => {
        expect(mockProps.onResume).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when starting', () => {
      const { getByText } = render(
        <TrackingControls
          {...mockProps}
          sessionState={RunSessionState.STARTING}
        />
      );

      expect(getByText('Starting...')).toBeTruthy();
    });

    it('should show loading indicator when stopping', () => {
      const { getByText } = render(
        <TrackingControls
          {...mockProps}
          sessionState={RunSessionState.STOPPING}
        />
      );

      expect(getByText('Saving...')).toBeTruthy();
    });
  });
});
