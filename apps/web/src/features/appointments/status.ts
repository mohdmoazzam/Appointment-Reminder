import type { BadgeTone } from '@/components/ui/Badge';
import { isPast } from '@/lib/date';
import type { AppointmentStatus } from '@/types/enums';
import type { Appointment } from '@/types/models';
import type { SettableStatus } from './types';

/*
 * Mirrors ALLOWED_TRANSITIONS in apps/api/src/appointments/appointments.service.ts so the UI
 * only offers changes the API accepts: booked → confirmed → completed / cancelled / no-show
 * (booked may skip straight to the last three); the final states can't change.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, SettableStatus[]> = {
  booked: ['confirmed', 'completed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Status changes available now. Completed and no-show only once the appointment has started. */
export function availableStatusChanges(appointment: Appointment): SettableStatus[] {
  const started = isPast(appointment.starts_at);
  return ALLOWED_TRANSITIONS[appointment.status].filter(
    (status) => started || (status !== 'completed' && status !== 'no_show'),
  );
}

export function canReschedule(appointment: Appointment): boolean {
  return appointment.status === 'booked' || appointment.status === 'confirmed';
}

export const STATUS_ACTION_LABELS: Record<SettableStatus, string> = {
  confirmed: 'Confirm',
  completed: 'Mark completed',
  cancelled: 'Cancel',
  no_show: 'Mark no-show',
};

export const STATUS_BADGE_TONES: Record<AppointmentStatus, BadgeTone> = {
  booked: 'brand',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  no_show: 'warning',
};
