import { z } from 'zod';
import type { CustomerInput } from '@/features/appointments/types';
import { optionalEmailSchema, requiredPhoneSchema, requiredText } from '@/lib/validation';

/** A customer's details as typed when booking (dashboard or online). */
export const customerFieldsSchema = z.object({
  first_name: requiredText('First name', 100),
  last_name: requiredText('Last name', 100),
  phone: requiredPhoneSchema,
  email: optionalEmailSchema,
});

export type CustomerFieldsValues = z.infer<typeof customerFieldsSchema>;

export function emptyCustomerFields(): CustomerFieldsValues {
  return { first_name: '', last_name: '', phone: '', email: '' };
}

export function toCustomerInput(values: CustomerFieldsValues): CustomerInput {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    phone: values.phone,
    email: values.email === '' ? undefined : values.email,
  };
}
