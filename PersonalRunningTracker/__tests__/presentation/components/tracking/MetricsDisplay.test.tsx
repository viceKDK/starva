import React from 'react';
import { render } from '@testing-library/react-native';
import { MetricsDisplay } from '../../../../src/presentation/components/tracking/MetricsDisplay';
import { RunMetrics } from '../../../../src/presentation/controllers/RunTrackingController';

describe('MetricsDisplay', () => {
  const mockMetrics: RunMetrics = {
    duration: 1800, // 30 minutes
    distance: 5000, // 5 km
    pace: 360, // 6 minutes per km
    currentSpeed: 2.78 // ~10 km/h
  };

  it('should render duration in MM:SS format for under an hour', () => {
    const { getByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={false} />
    );

    expect(getByText('30:00')).toBeTruthy();
  });

  it('should render duration in HH:MM:SS format for over an hour', () => {
    const metricsOverHour = { ...mockMetrics, duration: 3661 }; // 1:01:01
    const { getByText } = render(
      <MetricsDisplay metrics={metricsOverHour} isTracking={false} />
    );

    expect(getByText('01:01:01')).toBeTruthy();
  });

  it('should render distance in kilometers with 2 decimal places', () => {
    const { getByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={false} />
    );

    expect(getByText('5.00')).toBeTruthy();
  });

  it('should render pace in MM:SS format', () => {
    const { getByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={false} />
    );

    expect(getByText('6:00')).toBeTruthy();
  });

  it('should show --:-- for invalid pace values', () => {
    const invalidMetrics = { ...mockMetrics, pace: 0 };
    const { getByText } = render(
      <MetricsDisplay metrics={invalidMetrics} isTracking={false} />
    );

    expect(getByText('--:--')).toBeTruthy();
  });

  it('should render current speed in km/h', () => {
    const { getByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={false} />
    );

    expect(getByText('10.0')).toBeTruthy();
  });

  it('should show tracking indicator when isTracking is true', () => {
    const { getByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={true} />
    );

    expect(getByText('Tracking')).toBeTruthy();
  });

  it('should not show tracking indicator when isTracking is false', () => {
    const { queryByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={false} />
    );

    expect(queryByText('Tracking')).toBeNull();
  });

  it('should render all metric labels correctly', () => {
    const { getByText } = render(
      <MetricsDisplay metrics={mockMetrics} isTracking={false} />
    );

    expect(getByText('Duration')).toBeTruthy();
    expect(getByText('km')).toBeTruthy();
    expect(getByText('pace/km')).toBeTruthy();
    expect(getByText('km/h')).toBeTruthy();
  });
});