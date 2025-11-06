import { GPSPoint } from '@/domain/entities';

export interface ValidationResult<T = any> {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: T;
}

export interface NumericValidationOptions {
  min?: number;
  max?: number;
  required?: boolean;
  allowZero?: boolean;
  precision?: number;
}

export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  pattern?: RegExp;
  trim?: boolean;
}

export interface DateValidationOptions {
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  allowFuture?: boolean;
}

export class ValidationUtils {
  /**
   * Validate numeric value with optional constraints
   */
  static validateNumber(
    value: any,
    fieldName: string,
    options: NumericValidationOptions = {}
  ): ValidationResult<number> {
    const {
      min,
      max,
      required = false,
      allowZero = true,
      precision
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required
    if (required && (value === null || value === undefined)) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    // If not required and empty, return valid
    if (!required && (value === null || value === undefined)) {
      return { isValid: true, errors, warnings };
    }

    // Convert to number
    const numValue = Number(value);

    // Check if valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      errors.push(`${fieldName} must be a valid number`);
      return { isValid: false, errors, warnings };
    }

    // Check zero constraint
    if (!allowZero && numValue === 0) {
      errors.push(`${fieldName} cannot be zero`);
    }

    // Check min constraint
    if (min !== undefined && numValue < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    // Check max constraint
    if (max !== undefined && numValue > max) {
      errors.push(`${fieldName} must be at most ${max}`);
    }

    // Check precision
    if (precision !== undefined && precision >= 0) {
      const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
      if (decimalPlaces > precision) {
        warnings.push(`${fieldName} has more than ${precision} decimal places`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: numValue
    };
  }

  /**
   * Validate string value with optional constraints
   */
  static validateString(
    value: any,
    fieldName: string,
    options: StringValidationOptions = {}
  ): ValidationResult<string> {
    const {
      minLength,
      maxLength,
      required = false,
      pattern,
      trim = true
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required
    if (required && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    // If not required and empty, return valid
    if (!required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors, warnings };
    }

    // Convert to string and optionally trim
    let stringValue = String(value);
    if (trim) {
      stringValue = stringValue.trim();
    }

    // Check length constraints
    if (minLength !== undefined && stringValue.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (maxLength !== undefined && stringValue.length > maxLength) {
      errors.push(`${fieldName} must be at most ${maxLength} characters long`);
    }

    // Check pattern constraint
    if (pattern && !pattern.test(stringValue)) {
      errors.push(`${fieldName} format is invalid`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: stringValue
    };
  }

  /**
   * Validate date value with optional constraints
   */
  static validateDate(
    value: any,
    fieldName: string,
    options: DateValidationOptions = {}
  ): ValidationResult<Date> {
    const {
      required = false,
      minDate,
      maxDate,
      allowFuture = true
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required
    if (required && (value === null || value === undefined)) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    // If not required and empty, return valid
    if (!required && (value === null || value === undefined)) {
      return { isValid: true, errors, warnings };
    }

    // Convert to Date
    let dateValue: Date;
    if (value instanceof Date) {
      dateValue = value;
    } else {
      dateValue = new Date(value);
    }

    // Check if valid date
    if (isNaN(dateValue.getTime())) {
      errors.push(`${fieldName} must be a valid date`);
      return { isValid: false, errors, warnings };
    }

    // Check future constraint
    if (!allowFuture && dateValue > new Date()) {
      errors.push(`${fieldName} cannot be in the future`);
    }

    // Check min date constraint
    if (minDate && dateValue < minDate) {
      errors.push(`${fieldName} must be after ${minDate.toLocaleDateString()}`);
    }

    // Check max date constraint
    if (maxDate && dateValue > maxDate) {
      errors.push(`${fieldName} must be before ${maxDate.toLocaleDateString()}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: dateValue
    };
  }

  /**
   * Validate GPS coordinates
   */
  static validateGPSCoordinates(
    latitude: any,
    longitude: any
  ): ValidationResult<{ latitude: number; longitude: number }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const latResult = this.validateNumber(latitude, 'Latitude', {
      required: true,
      min: -90,
      max: 90
    });

    const lonResult = this.validateNumber(longitude, 'Longitude', {
      required: true,
      min: -180,
      max: 180
    });

    errors.push(...latResult.errors);
    errors.push(...lonResult.errors);
    warnings.push(...latResult.warnings);
    warnings.push(...lonResult.warnings);

    const base = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
    if (latResult.data !== undefined && lonResult.data !== undefined) {
      return {
        ...base,
        data: {
          latitude: latResult.data,
          longitude: lonResult.data
        }
      };
    }
    return base;
  }

  /**
   * Validate GPS point object
   */
  static validateGPSPoint(point: any): ValidationResult<GPSPoint> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!point || typeof point !== 'object') {
      errors.push('GPS point must be an object');
      return { isValid: false, errors, warnings };
    }

    // Validate coordinates
    const coordsResult = this.validateGPSCoordinates(point.latitude, point.longitude);
    errors.push(...coordsResult.errors);
    warnings.push(...coordsResult.warnings);

    // Validate timestamp
    const timestampResult = this.validateDate(point.timestamp, 'Timestamp', {
      required: true,
      allowFuture: false
    });
    errors.push(...timestampResult.errors);
    warnings.push(...timestampResult.warnings);

    // Validate optional accuracy
    if (point.accuracy !== undefined) {
      const accuracyResult = this.validateNumber(point.accuracy, 'Accuracy', {
        min: 0,
        max: 1000 // reasonable max accuracy in meters
      });
      errors.push(...accuracyResult.errors);
      warnings.push(...accuracyResult.warnings);
    }

    // Validate optional altitude
    if (point.altitude !== undefined) {
      const altitudeResult = this.validateNumber(point.altitude, 'Altitude', {
        min: -500, // Dead Sea level
        max: 9000  // Mount Everest
      });
      warnings.push(...altitudeResult.warnings);
      if (!altitudeResult.isValid) {
        warnings.push('Altitude value seems unrealistic');
      }
    }

    const base = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
    if (coordsResult.data && timestampResult.data) {
      return {
        ...base,
        data: {
          latitude: coordsResult.data.latitude,
          longitude: coordsResult.data.longitude,
          timestamp: timestampResult.data,
          accuracy: point.accuracy,
          altitude: point.altitude
        }
      };
    }
    return base;
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult<string> {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.validateString(email, 'Email', {
      required: true,
      pattern: emailPattern,
      maxLength: 254
    });
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): ValidationResult<string> {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return this.validateString(uuid, 'UUID', {
      required: true,
      pattern: uuidPattern
    });
  }

  /**
   * Validate array with optional constraints
   */
  static validateArray<T>(
    value: any,
    fieldName: string,
    itemValidator?: (item: any, index: number) => ValidationResult<T>,
    options: { minLength?: number; maxLength?: number; required?: boolean } = {}
  ): ValidationResult<T[]> {
    const { minLength, maxLength, required = false } = options;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required
    if (required && (value === null || value === undefined)) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, warnings };
    }

    // If not required and empty, return valid
    if (!required && (value === null || value === undefined)) {
      return { isValid: true, errors, warnings };
    }

    // Check if array
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
      return { isValid: false, errors, warnings };
    }

    // Check length constraints
    if (minLength !== undefined && value.length < minLength) {
      errors.push(`${fieldName} must contain at least ${minLength} items`);
    }

    if (maxLength !== undefined && value.length > maxLength) {
      errors.push(`${fieldName} must contain at most ${maxLength} items`);
    }

    // Validate individual items if validator provided
    const validatedItems: T[] = [];
    if (itemValidator) {
      value.forEach((item, index) => {
        const itemResult = itemValidator(item, index);
        if (itemResult.errors.length > 0) {
          errors.push(...itemResult.errors.map(error => `${fieldName}[${index}]: ${error}`));
        }
        if (itemResult.warnings.length > 0) {
          warnings.push(...itemResult.warnings.map(warning => `${fieldName}[${index}]: ${warning}`));
        }
        if (itemResult.data !== undefined) {
          validatedItems.push(itemResult.data);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: itemValidator ? validatedItems : value
    };
  }

  /**
   * Combine multiple validation results
   */
  static combineValidationResults<T extends Record<string, any>>(
    results: Record<keyof T, ValidationResult>
  ): ValidationResult<T> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: Partial<T> = {};

    for (const [key, result] of Object.entries(results)) {
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      if (result.data !== undefined) {
        data[key as keyof T] = result.data;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: data as T
    };
  }
}
