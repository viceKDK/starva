export interface TimeFormatOptions {
  format?: 'short' | 'long' | 'digital';
  showHours?: boolean;
  showMilliseconds?: boolean;
}

export interface PaceFormatOptions {
  unit?: 'km' | 'mi';
  format?: 'min:sec' | 'decimal';
}

export interface DateFormatOptions {
  format?: 'short' | 'medium' | 'long' | 'relative';
  includeTime?: boolean;
  timezone?: string;
}

export class TimeUtils {
  /**
   * Format duration in seconds to human-readable string
   */
  static formatDuration(seconds: number, options: TimeFormatOptions = {}): string {
    const { format = 'digital', showHours = true, showMilliseconds = false } = options;

    const totalMs = Math.round(seconds * 1000);
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((totalMs % (1000 * 60)) / 1000);
    const ms = totalMs % 1000;

    switch (format) {
      case 'short':
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;

      case 'long': {
        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
        return parts.join(', ');
      }

      case 'digital':
      default: {
        let result = '';
        if (showHours && hours > 0) {
          result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
          result = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        if (showMilliseconds) {
          result += `.${ms.toString().padStart(3, '0')}`;
        }
        return result;
      }
    }
  }

  /**
   * Format pace (seconds per km/mile) to human-readable string
   */
  static formatPace(secondsPerUnit: number, options: PaceFormatOptions = {}): string {
    const { unit = 'km', format = 'min:sec' } = options;

    if (!isFinite(secondsPerUnit) || secondsPerUnit <= 0) {
      return '--:--';
    }

    const minutes = Math.floor(secondsPerUnit / 60);
    const seconds = Math.floor(secondsPerUnit % 60);

    switch (format) {
      case 'decimal':
        return `${(secondsPerUnit / 60).toFixed(2)} min/${unit}`;
      case 'min:sec':
      default:
        return `${minutes}:${seconds.toString().padStart(2, '0')} min/${unit}`;
    }
  }

  /**
   * Format speed (m/s, km/h, or mph)
   */
  static formatSpeed(
    metersPerSecond: number,
    unit: 'mps' | 'kmh' | 'mph' = 'kmh',
    precision: number = 1
  ): string {
    if (!isFinite(metersPerSecond) || metersPerSecond < 0) {
      return '--';
    }

    let speed: number;
    let unitLabel: string;

    switch (unit) {
      case 'kmh':
        speed = metersPerSecond * 3.6;
        unitLabel = 'km/h';
        break;
      case 'mph':
        speed = metersPerSecond * 2.237;
        unitLabel = 'mph';
        break;
      case 'mps':
      default:
        speed = metersPerSecond;
        unitLabel = 'm/s';
        break;
    }

    return `${speed.toFixed(precision)} ${unitLabel}`;
  }

  /**
   * Format date to human-readable string
   */
  static formatDate(date: Date, options: DateFormatOptions = {}): string {
    const { format = 'medium', includeTime = false, timezone } = options;

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone
    };

    switch (format) {
      case 'short':
        formatOptions.dateStyle = 'short';
        break;
      case 'long':
        formatOptions.dateStyle = 'full';
        break;
      case 'relative':
        return this.formatRelativeDate(date);
      case 'medium':
      default:
        formatOptions.dateStyle = 'medium';
        break;
    }

    if (includeTime) {
      formatOptions.timeStyle = 'short';
    }

    return date.toLocaleDateString('en-US', formatOptions);
  }

  /**
   * Format date as relative time (e.g., "2 hours ago", "yesterday")
   */
  static formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Parse duration string (e.g., "1:23:45" or "23:45") to seconds
   */
  static parseDuration(durationString: string): number {
    const parts = durationString.split(':').map(Number);

    if (parts.length === 2) {
      // MM:SS format
      const minutes = parts[0]!;
      const seconds = parts[1]!;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parts[0]!;
      const minutes = parts[1]!;
      const seconds = parts[2]!;
      return hours * 3600 + minutes * 60 + seconds;
    }

    throw new Error(`Invalid duration format: ${durationString}`);
  }

  /**
   * Calculate time difference between two dates
   */
  static getTimeDifference(
    startDate: Date,
    endDate: Date,
    unit: 'ms' | 'seconds' | 'minutes' | 'hours' | 'days' = 'ms'
  ): number {
    const diffMs = endDate.getTime() - startDate.getTime();

    switch (unit) {
      case 'seconds':
        return diffMs / 1000;
      case 'minutes':
        return diffMs / (1000 * 60);
      case 'hours':
        return diffMs / (1000 * 60 * 60);
      case 'days':
        return diffMs / (1000 * 60 * 60 * 24);
      case 'ms':
      default:
        return diffMs;
    }
  }

  /**
   * Check if two dates are on the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Get start of day for a given date
   */
  static getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get end of day for a given date
   */
  static getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Get start of week for a given date (Monday as first day)
   */
  static getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get start of month for a given date
   */
  static getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Check if a date is within a given range
   */
  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  /**
   * Generate array of dates between two dates
   */
  static getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Convert pace (seconds per km) to speed (km/h)
   */
  static paceToSpeed(secondsPerKm: number): number {
    if (!isFinite(secondsPerKm) || secondsPerKm <= 0) return 0;
    return 3600 / secondsPerKm; // km/h
  }

  /**
   * Convert speed (km/h) to pace (seconds per km)
   */
  static speedToPace(kmh: number): number {
    if (!isFinite(kmh) || kmh <= 0) return 0;
    return 3600 / kmh; // seconds per km
  }
}
