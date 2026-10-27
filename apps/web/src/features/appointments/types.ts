import type { IsoDateTime, PageQuery } from '@/types/api';
import type { AppointmentStatus } from '@/types/enums';
import type { DateOnly } from '@/types/models';

/** A customer entered while booking; an existing customer with the same phone is reused. */
export interface CustomerInput {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
}

/** POST /appointments (CreateAppointmentDto): give customer_id or customer. */
export interface CreateAppointmentRequest {
  service_id: string;
  staff_id: string;
  starts_at: IsoDateTime;
  customer_id?: string;
  customer?: CustomerInput;
  notes?: string | null;
  /** Allow a time outside working hours (walk-ins). Double booking is still refused. */
  ignore_schedule?: boolean;
}

/** PATCH /appointments/:id/reschedule */
export interface RescheduleAppointmentRequest {
  starts_at: IsoDateTime;
  staff_id?: string;
  ignore_schedule?: boolean;
}

/** Statuses a client can set ("booked" is only the starting state). */
export type SettableStatus = Exclude<AppointmentStatus, 'booked'>;

/** POST /appointments/:id/status */
export interface UpdateAppointmentStatusRequest {
  status: SettableStatus;
  cancellation_reason?: string;
}

/** GET /appointments (ListAppointmentsDto) */
export interface AppointmentsQuery extends PageQuery {
  /** Inclusive, in the business's time zone. */
  date_from?: DateOnly;
  date_to?: DateOnly;
  staff_id?: string;
  customer_id?: string;
  status?: AppointmentStatus;
  exclude_cancelled?: boolean;
}

/** GET /availability (AvailabilityQueryDto) */
export interface AvailabilityQuery {
  service_id: string;
  date: DateOnly;
  staff_id?: string;
  /** Treat this appointment's time as free (when rescheduling it). */
  ignore_appointment_id?: string;
}
