import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDaysToDate } from '@/lib/date';
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

/** How many days ahead one "Find next available day" search looks before giving up. */
export const NEXT_AVAILABLE_SEARCH_DAYS = 14;

/**
 * Returns a function that looks day by day after `fromDate` (up to NEXT_AVAILABLE_SEARCH_DAYS
 * days, never past `lastDate`) for the first day with free times. Each day's result is cached
 * like a normal visit to that day, so the times show instantly when the day is opened.
 */
export function useFindNextAvailableDate(slug: string) {
  const queryClient = useQueryClient();
  return async (
    query: Omit<PublicAvailabilityQuery, 'date'>,
    fromDate: string,
    lastDate: string,
  ): Promise<string | null> => {
    for (let offset = 1; offset <= NEXT_AVAILABLE_SEARCH_DAYS; offset++) {
      const date = addDaysToDate(fromDate, offset);
      if (date > lastDate) return null;
      const dayQuery = { ...query, date };
      const slots = await queryClient.fetchQuery({
        queryKey: bookingKeys.slots(slug, dayQuery),
        queryFn: () => listPublicSlots(slug, dayQuery),
      });
      if (slots.length > 0) return date;
    }
    return null;
  };
}

export function useBookPublicAppointment(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublicBookingRequest) => bookPublicAppointment(slug, request),
    // Booked or refused (time taken), the free times have changed.
    onSettled: () => queryClient.invalidateQueries({ queryKey: bookingKeys.slotsAll(slug) }),
  });
}
