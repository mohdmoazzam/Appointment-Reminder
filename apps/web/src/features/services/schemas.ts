import { z } from 'zod';
import { optionalText, requiredText } from '@/lib/validation';
import type { Service } from '@/types/models';
import type { CreateServiceRequest } from './types';

/** Same limits as the API (SERVICE_MIN_MINUTES / SERVICE_MAX_MINUTES / MAX_PRICE). */
export const SERVICE_MIN_MINUTES = 5;
export const SERVICE_MAX_MINUTES = 720;
const MAX_PRICE = 99_999_999.99;

const WHOLE_NUMBER = /^\d+$/;
/** "450", "450.5" or "450.50" */
const PRICE = /^\d+(\.\d{1,2})?$/;

/*
 * Number inputs hold strings, so duration and price are validated as text here and converted
 * to numbers in toServiceRequest.
 */
export const serviceFormSchema = z.object({
  name: requiredText('Name', 100),
  description: optionalText('Description', 500),
  duration_minutes: z
    .string()
    .trim()
    .regex(WHOLE_NUMBER, 'Enter the duration in whole minutes')
    .refine((value) => {
      const minutes = Number(value);
      return minutes >= SERVICE_MIN_MINUTES && minutes <= SERVICE_MAX_MINUTES;
    }, `Duration must be between ${SERVICE_MIN_MINUTES} and ${SERVICE_MAX_MINUTES} minutes`),
  price: z
    .string()
    .trim()
    .regex(PRICE, 'Enter a price like 450 or 450.50')
    .refine((value) => Number(value) <= MAX_PRICE, 'Price is too large'),
  is_active: z.boolean(),
  staff_ids: z.array(z.string()),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function emptyServiceFormValues(): ServiceFormValues {
  return {
    name: '',
    description: '',
    duration_minutes: '30',
    price: '',
    is_active: true,
    staff_ids: [],
  };
}

export function toServiceFormValues(service: Service): ServiceFormValues {
  return {
    name: service.name,
    description: service.description ?? '',
    duration_minutes: String(service.duration_minutes),
    price: service.price,
    is_active: service.is_active,
    staff_ids: service.staff.map((member) => member.id),
  };
}

/** Used for both create and update: every field is sent, so an update is a full replace. */
export function toServiceRequest(values: ServiceFormValues): CreateServiceRequest {
  return {
    name: values.name,
    description: values.description === '' ? null : values.description,
    duration_minutes: Number(values.duration_minutes),
    price: Number(values.price),
    is_active: values.is_active,
    staff_ids: values.staff_ids,
  };
}
