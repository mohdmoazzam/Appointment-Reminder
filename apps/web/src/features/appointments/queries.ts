import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersKeys } from '@/features/customers/queries';
import {
  createAppointment,
  listAppointments,
  listAvailableSlots,
  rescheduleAppointment,
  updateAppointmentStatus,
} from './api';
import type {
  AppointmentsQuery,
  AvailabilityQuery,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentStatusRequest,
} from './types';

export const appointmentsKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentsKeys.all, 'list'] as const,
  list: (query: AppointmentsQuery) => [...appointmentsKeys.lists(), query] as const,
  availabilityAll: () => [...appointmentsKeys.all, 'availability'] as const,
  availability: (query: AvailabilityQuery) =>
    [...appointmentsKeys.availabilityAll(), query] as const,
};

export function useAppointments(query: AppointmentsQuery) {
  return useQuery({
    queryKey: appointmentsKeys.list(query),
    queryFn: () => listAppointments(query),
    placeholderData: keepPreviousData,
  });
}

/** Free start times; pass null until a service and a date are chosen. */
export function useAvailableSlots(query: AvailabilityQuery | null) {
  return useQuery({
    queryKey: query ? appointmentsKeys.availability(query) : appointmentsKeys.availabilityAll(),
    queryFn: () => listAvailableSlots(query!),
    enabled: query !== null,
    // Times fill up; never offer a slot from an old list.
    staleTime: 0,
  });
}

/** Any change to an appointment affects lists, free times and possibly customers. */
function useInvalidateAppointments() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.all }),
      queryClient.invalidateQueries({ queryKey: customersKeys.all }),
    ]);
}

export function useCreateAppointment() {
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: (request: CreateAppointmentRequest) => createAppointment(request),
    onSuccess: invalidate,
    // A 409 means the time was taken meanwhile; refresh the free times either way.
    onError: invalidate,
  });
}

interface RescheduleInput {
  appointmentId: string;
  request: RescheduleAppointmentRequest;
}

export function useRescheduleAppointment() {
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: ({ appointmentId, request }: RescheduleInput) =>
      rescheduleAppointment(appointmentId, request),
    onSuccess: invalidate,
    onError: invalidate,
  });
}

interface UpdateStatusInput {
  appointmentId: string;
  request: UpdateAppointmentStatusRequest;
}

export function useUpdateAppointmentStatus() {
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: ({ appointmentId, request }: UpdateStatusInput) =>
      updateAppointmentStatus(appointmentId, request),
    onSuccess: invalidate,
  });
}
