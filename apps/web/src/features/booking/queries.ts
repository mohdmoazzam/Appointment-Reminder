import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bookPublicAppointment,
  getPublicBusiness,
  listPublicServices,
  listPublicSlots,
} from './api';
import type { PublicAvailabilityQuery, PublicBookingRequest } from './types';

export const bookingKeys = {
  all: (slug: string) => ['booking', slug] as const,
  business: (slug: string) => [...bookingKeys.all(slug), 'business'] as const,
  services: (slug: string) => [...bookingKeys.all(slug), 'services'] as const,
  slotsAll: (slug: string) => [...bookingKeys.all(slug), 'slots'] as const,
  slots: (slug: string, query: PublicAvailabilityQuery) =>
    [...bookingKeys.slotsAll(slug), query] as const,
};

export function usePublicBusiness(slug: string) {
  return useQuery({ queryKey: bookingKeys.business(slug), queryFn: () => getPublicBusiness(slug) });
}

export function usePublicServices(slug: string) {
  return useQuery({
    queryKey: bookingKeys.services(slug),
    queryFn: () => listPublicServices(slug),
  });
}

/** Free times; pass null until a service and date are chosen. */
export function usePublicSlots(slug: string, query: PublicAvailabilityQuery | null) {
  return useQuery({
    queryKey: query ? bookingKeys.slots(slug, query) : bookingKeys.slotsAll(slug),
    queryFn: () => listPublicSlots(slug, query!),
    enabled: query !== null,
    // Times fill up; always show the current list.
    staleTime: 0,
  });
}

export function useBookPublicAppointment(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublicBookingRequest) => bookPublicAppointment(slug, request),
    // Booked or refused (time taken), the free times have changed.
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingKeys.slotsAll(slug) }),
  });
}
