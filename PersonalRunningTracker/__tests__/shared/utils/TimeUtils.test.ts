import { TimeUtils } from '@/shared/utils/TimeUtils';

describe('TimeUtils', () => {
  describe('formatDuration', () => {
    it('should format duration in digital format', () => {
      expect(TimeUtils.formatDuration(3661)).toBe('01:01:01'); // 1 hour, 1 minute, 1 second
      expect(TimeUtils.formatDuration(125)).toBe('02:05'); // 2 minutes, 5 seconds
      expect(TimeUtils.formatDuration(45)).toBe('00:45'); // 45 seconds
    });

    it('should format duration in short format', () => {
      expect(TimeUtils.formatDuration(3661, { format: 'short' })).toBe('1h 1m');
      expect(TimeUtils.formatDuration(125, { format: 'short' })).toBe('2m 5s');
      expect(TimeUtils.formatDuration(45, { format: 'short' })).toBe('45s');
    });

    it('should format duration in long format', () => {
      expect(TimeUtils.formatDuration(3661, { format: 'long' })).toBe('1 hour, 1 minute, 1 second');
      expect(TimeUtils.formatDuration(125, { format: 'long' })).toBe('2 minutes, 5 seconds');
      expect(TimeUtils.formatDuration(45, { format: 'long' })).toBe('45 seconds');
      expect(TimeUtils.formatDuration(1, { format: 'long' })).toBe('1 second');
    });

    it('should handle zero duration', () => {
      expect(TimeUtils.formatDuration(0)).toBe('00:00');
      expect(TimeUtils.formatDuration(0, { format: 'short' })).toBe('0s');
      expect(TimeUtils.formatDuration(0, { format: 'long' })).toBe('0 seconds');
    });

    it('should show milliseconds when requested', () => {
      expect(TimeUtils.formatDuration(1.5, { showMilliseconds: true })).toBe('00:01.500');
      expect(TimeUtils.formatDuration(65.123, { showMilliseconds: true })).toBe('01:05.123');
    });

    it('should hide hours when showHours is false', () => {
      expect(TimeUtils.formatDuration(3661, { showHours: false })).toBe('61:01');
    });
  });

  describe('formatPace', () => {
    it('should format pace in min:sec format', () => {
      expect(TimeUtils.formatPace(300)).toBe('5:00 min/km'); // 5 minutes per km
      expect(TimeUtils.formatPace(285)).toBe('4:45 min/km'); // 4:45 per km
      expect(TimeUtils.formatPace(360)).toBe('6:00 min/km'); // 6 minutes per km
    });

    it('should format pace for miles', () => {
      expect(TimeUtils.formatPace(300, { unit: 'mi' })).toBe('5:00 min/mi');
    });

    it('should format pace in decimal format', () => {
      expect(TimeUtils.formatPace(300, { format: 'decimal' })).toBe('5.00 min/km');
      expect(TimeUtils.formatPace(285, { format: 'decimal' })).toBe('4.75 min/km');
    });

    it('should handle invalid pace values', () => {
      expect(TimeUtils.formatPace(0)).toBe('--:--');
      expect(TimeUtils.formatPace(Infinity)).toBe('--:--');
      expect(TimeUtils.formatPace(-300)).toBe('--:--');
      expect(TimeUtils.formatPace(NaN)).toBe('--:--');
    });

    it('should pad seconds correctly', () => {
      expect(TimeUtils.formatPace(305)).toBe('5:05 min/km'); // 5:05
      expect(TimeUtils.formatPace(309)).toBe('5:09 min/km'); // 5:09
    });
  });

  describe('formatSpeed', () => {
    it('should format speed in km/h', () => {
      expect(TimeUtils.formatSpeed(5)).toBe('18.0 km/h'); // 5 m/s = 18 km/h
      expect(TimeUtils.formatSpeed(2.5)).toBe('9.0 km/h'); // 2.5 m/s = 9 km/h
    });

    it('should format speed in mph', () => {
      expect(TimeUtils.formatSpeed(5, 'mph')).toBe('11.2 mph'); // 5 m/s ≈ 11.2 mph
    });

    it('should format speed in m/s', () => {
      expect(TimeUtils.formatSpeed(5, 'mps')).toBe('5.0 m/s');
    });

    it('should handle precision parameter', () => {
      expect(TimeUtils.formatSpeed(5, 'kmh', 2)).toBe('18.00 km/h');
      expect(TimeUtils.formatSpeed(5, 'kmh', 0)).toBe('18 km/h');
    });

    it('should handle invalid speeds', () => {
      expect(TimeUtils.formatSpeed(Infinity)).toBe('--');
      expect(TimeUtils.formatSpeed(-5)).toBe('--');
      expect(TimeUtils.formatSpeed(NaN)).toBe('--');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T14:30:00Z');

    it('should format date in medium format', () => {
      const formatted = TimeUtils.formatDate(testDate);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format date in short format', () => {
      const formatted = TimeUtils.formatDate(testDate, { format: 'short' });
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should include time when requested', () => {
      const formatted = TimeUtils.formatDate(testDate, { includeTime: true });
      expect(formatted).toContain('2:30'); // Time portion
    });

    it('should format relative dates', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      expect(TimeUtils.formatDate(yesterday, { format: 'relative' })).toBe('Yesterday');
      expect(TimeUtils.formatDate(oneHourAgo, { format: 'relative' })).toBe('1 hour ago');
    });
  });

  describe('formatRelativeDate', () => {
    const now = new Date();

    it('should format recent times', () => {
      const justNow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      expect(TimeUtils.formatRelativeDate(justNow)).toBe('Just now');

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(fiveMinutesAgo)).toBe('5 minutes ago');

      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(oneHourAgo)).toBe('1 hour ago');
    });

    it('should format days', () => {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(yesterday)).toBe('Yesterday');

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('should format weeks', () => {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(oneWeekAgo)).toBe('1 week ago');

      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(twoWeeksAgo)).toBe('2 weeks ago');
    });

    it('should format months and years', () => {
      const oneMonthAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(oneMonthAgo)).toBe('1 month ago');

      const oneYearAgo = new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(oneYearAgo)).toBe('1 year ago');
    });

    it('should handle singular vs plural correctly', () => {
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      expect(TimeUtils.formatRelativeDate(oneMinuteAgo)).toBe('1 minute ago');

      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      expect(TimeUtils.formatRelativeDate(twoMinutesAgo)).toBe('2 minutes ago');
    });
  });

  describe('parseDuration', () => {
    it('should parse MM:SS format', () => {
      expect(TimeUtils.parseDuration('05:30')).toBe(330); // 5 minutes 30 seconds
      expect(TimeUtils.parseDuration('02:05')).toBe(125); // 2 minutes 5 seconds
      expect(TimeUtils.parseDuration('00:45')).toBe(45); // 45 seconds
    });

    it('should parse HH:MM:SS format', () => {
      expect(TimeUtils.parseDuration('01:05:30')).toBe(3930); // 1 hour 5 minutes 30 seconds
      expect(TimeUtils.parseDuration('02:00:00')).toBe(7200); // 2 hours
    });

    it('should throw error for invalid format', () => {
      expect(() => TimeUtils.parseDuration('invalid')).toThrow('Invalid duration format');
      expect(() => TimeUtils.parseDuration('1:2:3:4')).toThrow('Invalid duration format');
      expect(() => TimeUtils.parseDuration('')).toThrow('Invalid duration format');
    });
  });

  describe('getTimeDifference', () => {
    const startDate = new Date('2024-01-01T10:00:00Z');
    const endDate = new Date('2024-01-01T11:30:00Z');

    it('should calculate difference in different units', () => {
      expect(TimeUtils.getTimeDifference(startDate, endDate, 'ms')).toBe(90 * 60 * 1000);
      expect(TimeUtils.getTimeDifference(startDate, endDate, 'seconds')).toBe(90 * 60);
      expect(TimeUtils.getTimeDifference(startDate, endDate, 'minutes')).toBe(90);
      expect(TimeUtils.getTimeDifference(startDate, endDate, 'hours')).toBe(1.5);
    });

    it('should handle negative differences', () => {
      expect(TimeUtils.getTimeDifference(endDate, startDate, 'minutes')).toBe(-90);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2024-01-01T10:00:00Z');
      const date2 = new Date('2024-01-01T15:00:00Z');
      expect(TimeUtils.isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-01-01T23:59:59Z');
      const date2 = new Date('2024-01-02T00:00:01Z');
      expect(TimeUtils.isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2024-01-01T15:30:45Z');
      const startOfDay = TimeUtils.getStartOfDay(date);

      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2024-01-01T15:30:45Z');
      const endOfDay = TimeUtils.getEndOfDay(date);

      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });
  });

  describe('paceToSpeed and speedToPace', () => {
    it('should convert pace to speed', () => {
      const pace = 300; // 5:00 min/km
      const speed = TimeUtils.paceToSpeed(pace);
      expect(speed).toBeCloseTo(12, 1); // 12 km/h
    });

    it('should convert speed to pace', () => {
      const speed = 12; // 12 km/h
      const pace = TimeUtils.speedToPace(speed);
      expect(pace).toBeCloseTo(300, 1); // 5:00 min/km
    });

    it('should be inverse operations', () => {
      const originalPace = 280; // 4:40 min/km
      const speed = TimeUtils.paceToSpeed(originalPace);
      const convertedBackPace = TimeUtils.speedToPace(speed);
      expect(convertedBackPace).toBeCloseTo(originalPace, 1);
    });

    it('should handle edge cases', () => {
      expect(TimeUtils.paceToSpeed(0)).toBe(0);
      expect(TimeUtils.paceToSpeed(Infinity)).toBe(0);
      expect(TimeUtils.speedToPace(0)).toBe(0);
      expect(TimeUtils.speedToPace(Infinity)).toBe(0);
    });
  });

  describe('getDateRange', () => {
    it('should generate date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');
      const range = TimeUtils.getDateRange(startDate, endDate);

      expect(range).toHaveLength(3);
      expect(range[0]).toEqual(startDate);
      expect(range[2]).toEqual(endDate);
    });

    it('should handle single day range', () => {
      const date = new Date('2024-01-01');
      const range = TimeUtils.getDateRange(date, date);

      expect(range).toHaveLength(1);
      expect(range[0]).toEqual(date);
    });
  });
});