import { z } from 'zod';
import { BUSINESS_TYPES } from '@/types/enums';
import type { Business } from '@/types/models';
import { emptyToNull, optionalPhoneSchema, optionalText, requiredText } from '@/lib/validation';
import type { UpdateBusinessRequest } from './types';

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export const businessProfileSchema = z.object({
  name: requiredText('Business name', 100),
  type: z.enum(BUSINESS_TYPES, { error: 'Choose a business type' }),
  timezone: z.string().min(1, 'Choose a time zone'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency'),
  phone: optionalPhoneSchema,
  address_line1: optionalText('Address line 1', 200),
  address_line2: optionalText('Address line 2', 200),
  city: optionalText('City', 100),
  state: optionalText('State', 100),
  postal_code: optionalText('Postal code', 20),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === '' || COUNTRY_CODE_PATTERN.test(value), {
      error: 'Use a 2-letter country code, e.g. IN',
    }),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;

/** Business → form values. Inputs can't hold null, so empty columns become ''. */
export function toBusinessProfileFormValues(business: Business): BusinessProfileFormValues {
  return {
    name: business.name,
    type: business.type,
    timezone: business.timezone,
    currency: business.currency,
    phone: business.phone ?? '',
    address_line1: business.address_line1 ?? '',
    address_line2: business.address_line2 ?? '',
    city: business.city ?? '',
    state: business.state ?? '',
    postal_code: business.postal_code ?? '',
    country: business.country ?? '',
  };
}

/** Form values → PATCH body. Empty optional fields are sent as null to clear them. */
export function toUpdateBusinessRequest(values: BusinessProfileFormValues): UpdateBusinessRequest {
  return {
    name: values.name,
    type: values.type,
    timezone: values.timezone,
    currency: values.currency,
    phone: emptyToNull(values.phone),
    address_line1: emptyToNull(values.address_line1),
    address_line2: emptyToNull(values.address_line2),
    city: emptyToNull(values.city),
    state: emptyToNull(values.state),
    postal_code: emptyToNull(values.postal_code),
    country: emptyToNull(values.country),
  };
}
