import { z } from 'zod';
import { countDays, formatTimeOfDay } from '@/lib/date';
import { optionalText, requiredText } from '@/lib/validation';
import type { BusinessClosure } from '@/types/models';
import type { CreateClosureRequest, CreateTimeOffRequest } from './types';
import { MAX_SESSIONS_PER_DAY } from './working-hours';

/** Same limit as the API (MAX_DATE_RANGE_DAYS). */
const MAX_DATE_RANGE_DAYS = 366;

/** "HH:mm"; <input type="time"> produces exactly this. String comparison orders times correctly. */
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time');

// --- Weekly working hours ------------------------------------------------------------------------

const sessionSchema = z.object({ start_time: timeOfDay, end_time: timeOfDay });

const daySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  is_working: z.boolean(),
  sessions: z
    .array(sessionSchema)
    .min(1)
    .max(MAX_SESSIONS_PER_DAY, `At most ${MAX_SESSIONS_PER_DAY} sessions a day`),
});

/**
 * Rules for each working day (days off are skipped, so half-typed times on a switched-off day
 * don't block saving):
 *  - every session ends after it starts. Sessions can't cross midnight, so a night shift is
 *    entered as two sessions on consecutive days;
 *  - sessions don't overlap. Back-to-back sessions (10:00–14:00, 14:00–18:00) are fine.
 * Sessions can be typed in any order; they're checked in time order and the error goes on the
 * session that needs fixing.
 */
export const weeklyScheduleSchema = z
  .object({ days: z.array(daySchema).length(7) })
  .superRefine((values, context) => {
    values.days.forEach((day, dayIndex) => {
      if (!day.is_working) return;

      const inTimeOrder = day.sessions
        .map((session, sessionIndex) => ({ ...session, sessionIndex }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      let previous: (typeof inTimeOrder)[number] | undefined;
      for (const session of inTimeOrder) {
        const path = ['days', dayIndex, 'sessions', session.sessionIndex, 'end_time'];
        if (session.end_time <= session.start_time) {
          context.addIssue({
            code: 'custom',
            path,
            message:
              'Must end after it starts. For hours past midnight, add the rest to the next day.',
          });
          // Skip the overlap check against a session that isn't a valid range.
          continue;
        }
        if (previous && session.start_time < previous.end_time) {
          context.addIssue({
            code: 'custom',
            path,
            message: `Overlaps the ${formatTimeOfDay(previous.start_time)} – ${formatTimeOfDay(previous.end_time)} session`,
          });
        }
        if (!previous || session.end_time > previous.end_time) previous = session;
      }
    });
  });

// --- Date ranges (time off, closures) ------------------------------------------------------------

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');

/** Inclusive range: ends_on may equal starts_on (a single day). */
function refineDateRange<T extends { starts_on: string; ends_on: string }>(
  values: T,
  context: z.RefinementCtx,
): void {
  if (values.ends_on < values.starts_on) {
    context.addIssue({
      code: 'custom',
      path: ['ends_on'],
      message: 'Must be on or after the first day',
    });
    return;
  }
  if (countDays(values.starts_on, values.ends_on) > MAX_DATE_RANGE_DAYS) {
    context.addIssue({
      code: 'custom',
      path: ['ends_on'],
      message: `Can't be longer than ${MAX_DATE_RANGE_DAYS} days`,
    });
  }
}

export const timeOffSchema = z
  .object({
    starts_on: dateOnly,
    ends_on: dateOnly,
    reason: optionalText('Reason', 200),
  })
  .superRefine(refineDateRange);

export type TimeOffFormValues = z.infer<typeof timeOffSchema>;

export function toCreateTimeOffRequest(values: TimeOffFormValues): CreateTimeOffRequest {
  return {
    starts_on: values.starts_on,
    ends_on: values.ends_on,
    reason: values.reason === '' ? null : values.reason,
  };
}

export const closureSchema = z
  .object({
    name: requiredText('Name', 100),
    starts_on: dateOnly,
    ends_on: dateOnly,
  })
  .superRefine(refineDateRange);

export type ClosureFormValues = z.infer<typeof closureSchema>;

export function toClosureFormValues(closure: BusinessClosure): ClosureFormValues {
  return { name: closure.name, starts_on: closure.starts_on, ends_on: closure.ends_on };
}

export function toClosureRequest(values: ClosureFormValues): CreateClosureRequest {
  return { name: values.name, starts_on: values.starts_on, ends_on: values.ends_on };
}
