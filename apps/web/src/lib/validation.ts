import { z } from 'zod';

/*
 * Field rules shared by forms. They mirror the class-validator rules in
 * apps/api/src/common/dtos so most mistakes are caught before a request is sent; the API
 * still validates everything.
 */

/** Same pattern as the API's phone validation. */
export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** A required, trimmed string. */
export function requiredText(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} must be ${maxLength} characters or fewer`);
}

/** An optional, trimmed string; an empty input is allowed (see emptyToNull). */
export function optionalText(label: string, maxLength: number) {
  return z.string().trim().max(maxLength, `${label} must be ${maxLength} characters or fewer`);
}

/** Trimmed and lower-cased, like the API does before saving. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email must be 254 characters or fewer')
  .pipe(z.email('Enter a valid email address'));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`);

export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(PHONE_PATTERN, 'Enter a valid phone number, e.g. +91 98765 43210');

/** Trimmed and lower-cased; an empty input is allowed. */
export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === '' || z.email().safeParse(value).success, {
    error: 'Enter a valid email address',
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || PHONE_PATTERN.test(value), {
    error: 'Enter a valid phone number, e.g. +91 98765 43210',
  });

/** For refine(): a form with `password` and `confirm_password` fields. */
export function passwordsMatch(values: { password: string; confirm_password: string }): boolean {
  return values.password === values.confirm_password;
}

export const PASSWORDS_MISMATCH = {
  path: ['confirm_password'],
  error: 'Passwords do not match',
};

/** Form inputs are '' when empty; the API expects null to clear an optional column. */
export function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
