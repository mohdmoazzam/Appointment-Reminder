import { z } from 'zod';
import { BUSINESS_TYPES } from '@/types/enums';
import {
  PASSWORDS_MISMATCH,
  emailSchema,
  newPasswordSchema,
  optionalPhoneSchema,
  passwordsMatch,
  requiredText,
} from '@/lib/validation';
import type { AcceptInviteRequest, LoginRequest, SignupRequest } from './types';

// ---------------------------------------------------------------------------------------------
// Login

export const loginSchema = z.object({
  email: emailSchema,
  // Not newPasswordSchema: existing passwords are checked by the server, not re-validated here.
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return { email: values.email, password: values.password };
}

// ---------------------------------------------------------------------------------------------
// Signup: one flat form, sent as { business, owner }.

export const signupSchema = z
  .object({
    business_name: requiredText('Business name', 100),
    business_type: z.enum(BUSINESS_TYPES, { error: 'Choose a business type' }),
    timezone: z.string().min(1, 'Choose a time zone'),
    phone: optionalPhoneSchema,
    first_name: requiredText('First name', 100),
    last_name: requiredText('Last name', 100),
    email: emailSchema,
    password: newPasswordSchema,
    confirm_password: z.string(),
  })
  .refine(passwordsMatch, PASSWORDS_MISMATCH);

export type SignupFormValues = z.infer<typeof signupSchema>;

export function toSignupRequest(values: SignupFormValues): SignupRequest {
  return {
    business: {
      name: values.business_name,
      type: values.business_type,
      timezone: values.timezone,
      phone: values.phone === '' ? undefined : values.phone,
    },
    owner: {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      password: values.password,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Accept invite

export const acceptInviteSchema = z
  .object({
    first_name: requiredText('First name', 100),
    last_name: requiredText('Last name', 100),
    password: newPasswordSchema,
    confirm_password: z.string(),
  })
  .refine(passwordsMatch, PASSWORDS_MISMATCH);

export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

export function toAcceptInviteRequest(values: AcceptInviteFormValues): AcceptInviteRequest {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    password: values.password,
  };
}
