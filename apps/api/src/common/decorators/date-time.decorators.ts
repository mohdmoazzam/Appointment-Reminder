import { registerDecorator, type ValidationOptions } from 'class-validator';
import { Helper } from '../helper.js';

/** Validates a calendar date in "YYYY-MM-DD" form that actually exists (no 2026-02-30). */
export function IsDateOnly(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} must be a date in YYYY-MM-DD format`, ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && Helper.isValidDateOnly(value),
      },
    });
  };
}

/** Validates a 24-hour time of day in "HH:mm" form, "00:00" to "23:59". */
export function IsTimeOfDay(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isTimeOfDay',
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} must be a time in HH:mm format (00:00-23:59)`, ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && Helper.isValidTimeOfDay(value),
      },
    });
  };
}
