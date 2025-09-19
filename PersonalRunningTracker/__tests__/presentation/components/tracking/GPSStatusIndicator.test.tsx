import React from 'react';
import { render } from '@testing-library/react-native';
import { GPSStatusIndicator } from '../../../../src/presentation/components/tracking/GPSStatusIndicator';
import { GPSStatus } from '../../../../src/presentation/controllers/RunTrackingController';

describe('GPSStatusIndicator', () => {
  it('should render excellent GPS status with accuracy', () => {
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.EXCELLENT}
        accuracy={3}
      />
    );

    expect(getByText('Excellent GPS')).toBeTruthy();
    expect(getByText('±3m')).toBeTruthy();
  });

  it('should render good GPS status with accuracy', () => {
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.GOOD}
        accuracy={8}
      />
    );

    expect(getByText('Good GPS')).toBeTruthy();
    expect(getByText('±8m')).toBeTruthy();
  });

  it('should render weak GPS status with accuracy', () => {
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.WEAK}
        accuracy={12}
      />
    );

    expect(getByText('Weak GPS')).toBeTruthy();
    expect(getByText('±12m')).toBeTruthy();
  });

  it('should render acquiring GPS status without accuracy', () => {
    const { getByText, queryByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.ACQUIRING}
        accuracy={null}
      />
    );

    expect(getByText('Acquiring GPS...')).toBeTruthy();
    expect(queryByText(/±\d+m/)).toBeNull();
  });

  it('should render error status without accuracy', () => {
    const { getByText, queryByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.ERROR}
        accuracy={null}
      />
    );

    expect(getByText('GPS Error')).toBeTruthy();
    expect(queryByText(/±\d+m/)).toBeNull();
  });

  it('should show warning for low accuracy (>15m)', () => {
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.WEAK}
        accuracy={20}
      />
    );

    expect(getByText('Low accuracy may affect tracking quality')).toBeTruthy();
  });

  it('should not show warning for good accuracy (<=15m)', () => {
    const { queryByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.GOOD}
        accuracy={10}
      />
    );

    expect(queryByText('Low accuracy may affect tracking quality')).toBeNull();
  });

  it('should display error message when provided', () => {
    const errorMessage = 'GPS permission denied';
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.ERROR}
        accuracy={null}
        error={errorMessage}
      />
    );

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('should handle unknown GPS status', () => {
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.UNKNOWN}
        accuracy={null}
      />
    );

    expect(getByText('GPS Unknown')).toBeTruthy();
  });

  it('should format accuracy values correctly', () => {
    const { getByText } = render(
      <GPSStatusIndicator
        status={GPSStatus.GOOD}
        accuracy={7.8}
      />
    );

    // Should round to nearest integer
    expect(getByText('±8m')).toBeTruthy();
  });
});