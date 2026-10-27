import { z } from 'zod';
import { customerFieldsSchema, toCustomerInput } from '@/features/customers/schemas';
import { zonedDateTimeToIso } from '@/lib/date';
import { optionalText } from '@/lib/validation';
import type { Slot } from '@/types/models';
import type { CreateAppointmentRequest, RescheduleAppointmentRequest } from './types';

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

/*
 * Choosing when: normally a free slot from the list. With "outside working hours" ticked a time
 * is typed instead (walk-ins); the API then skips the schedule but still refuses overlaps.
 */
const whenFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  /** starts_at of the chosen slot, '' when none. */
  slot_starts_at: z.string(),
  /** Staff free at the chosen slot (to resolve "anyone available"). */
  slot_staff_ids: z.array(z.string()),
  ignore_schedule: z.boolean(),
  manual_time: z.string(),
};

function refineWhen(
  values: {
    slot_starts_at: string;
    ignore_schedule: boolean;
    manual_time: string;
    staff_id: string;
  },
  context: z.RefinementCtx,
): void {
  if (values.ignore_schedule) {
    if (!TIME_OF_DAY.test(values.manual_time)) {
      context.addIssue({ code: 'custom', path: ['manual_time'], message: 'Enter a start time' });
    }
    if (!values.staff_id) {
      context.addIssue({
        code: 'custom',
        path: ['staff_id'],
        message: 'Choose who will see them when booking outside working hours',
      });
    }
  } else if (!values.slot_starts_at) {
    context.addIssue({ code: 'custom', path: ['slot_starts_at'], message: 'Choose a time' });
  }
}

/** Fills the slot fields when a slot is picked. */
export function slotFields(slot: Slot) {
  return { slot_starts_at: slot.starts_at, slot_staff_ids: slot.staff_ids };
}

/** The start instant and staff member from the "when" fields (expects validated values). */
function resolveWhen(
  values: {
    date: string;
    slot_starts_at: string;
    slot_staff_ids: string[];
    ignore_schedule: boolean;
    manual_time: string;
    staff_id: string;
  },
  timeZone: string,
): { starts_at: string; staff_id: string } {
  if (values.ignore_schedule) {
    return {
      starts_at: zonedDateTimeToIso(values.date, values.manual_time, timeZone),
      staff_id: values.staff_id,
    };
  }
  // "Anyone available" ('') → the first staff member free at that time.
  return {
    starts_at: values.slot_starts_at,
    staff_id: values.staff_id || values.slot_staff_ids[0]!,
  };
}

// --- New appointment -----------------------------------------------------------------------------

export const newAppointmentSchema = z
  .object({
    service_id: z.string().min(1, 'Choose a service'),
    /** '' means anyone who is free. */
    staff_id: z.string(),
    ...whenFields,
    customer_mode: z.enum(['existing', 'new']),
    customer_id: z.string(),
    // Plain strings here; checked with customerFieldsSchema below, only for a new customer.
    new_customer: z.object({
      first_name: z.string(),
      last_name: z.string(),
      phone: z.string(),
      email: z.string(),
    }),
    notes: optionalText('Notes', 1000),
  })
  .superRefine((values, context) => {
    refineWhen(values, context);
    if (values.customer_mode === 'existing') {
      if (!values.customer_id) {
        context.addIssue({ code: 'custom', path: ['customer_id'], message: 'Choose a customer' });
      }
      return;
    }
    const customer = customerFieldsSchema.safeParse(values.new_customer);
    for (const issue of customer.error?.issues ?? []) {
      context.addIssue({
        code: 'custom',
        path: ['new_customer', ...issue.path],
        message: issue.message,
      });
    }
  });

export type NewAppointmentFormValues = z.infer<typeof newAppointmentSchema>;

export function emptyNewAppointmentValues(date: string): NewAppointmentFormValues {
  return {
    service_id: '',
    staff_id: '',
    date,
    slot_starts_at: '',
    slot_staff_ids: [],
    ignore_schedule: false,
    manual_time: '',
    customer_mode: 'existing',
    customer_id: '',
    new_customer: { first_name: '', last_name: '', phone: '', email: '' },
    notes: '',
  };
}

export function toCreateAppointmentRequest(
  values: NewAppointmentFormValues,
  timeZone: string,
): CreateAppointmentRequest {
  const { starts_at, staff_id } = resolveWhen(values, timeZone);
  return {
    service_id: values.service_id,
    staff_id,
    starts_at,
    ...(values.customer_mode === 'existing'
      ? { customer_id: values.customer_id }
      : // Parsing again applies the schema's trimming and lower-casing.
        { customer: toCustomerInput(customerFieldsSchema.parse(values.new_customer)) }),
    notes: values.notes === '' ? null : values.notes,
    ignore_schedule: values.ignore_schedule,
  };
}

// --- Reschedule ----------------------------------------------------------------------------------

export const rescheduleSchema = z
  .object({ staff_id: z.string().min(1, 'Choose a staff member'), ...whenFields })
  .superRefine(refineWhen);

export type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

export function toRescheduleRequest(
  values: RescheduleFormValues,
  timeZone: string,
): RescheduleAppointmentRequest {
  const { starts_at, staff_id } = resolveWhen(values, timeZone);
  return { starts_at, staff_id, ignore_schedule: values.ignore_schedule };
}
