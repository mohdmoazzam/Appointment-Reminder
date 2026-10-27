import { http } from '@/lib/api/http-client';
import type { Page } from '@/types/api';
import type { Appointment, Slot } from '@/types/models';
import type {
  AppointmentsQuery,
  AvailabilityQuery,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from './types';

/** Endpoints of apps/api/src/appointments/appointments.controller.ts. */

/** A day has at most 96 fifteen-minute starts, so one page of 100 holds all of them. */
const WHOLE_DAY = { page: 1, take: 100, order: 'asc' } as const;

export async function listAvailableSlots(query: AvailabilityQuery): Promise<Slot[]> {
  const page = await http.get<Page<Slot>>('/availability', { query: { ...query, ...WHOLE_DAY } });
  return page.data;
}

export function listAppointments(query: AppointmentsQuery): Promise<Page<Appointment>> {
  return http.get<Page<Appointment>>('/appointments', { query: { ...query } });
}

export function createAppointment(request: CreateAppointmentRequest): Promise<Appointment> {
  return http.post<Appointment>('/appointments', request);
}

export function rescheduleAppointment(
  appointmentId: string,
  request: RescheduleAppointmentRequest,
): Promise<Appointment> {
  return http.patch<Appointment>(`/appointments/${appointmentId}/reschedule`, request);
}

export function updateAppointmentStatus(
  appointmentId: string,
  request: UpdateAppointmentStatusRequest,
): Promise<Appointment> {
  return http.post<Appointment>(`/appointments/${appointmentId}/status`, request);
}
