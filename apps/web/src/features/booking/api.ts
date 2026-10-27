import { http } from '@/lib/api/http-client';
import type { Page } from '@/types/api';
import type { Slot } from '@/types/models';
import type {
  BookingConfirmation,
  PublicAvailabilityQuery,
  PublicBookingRequest,
  PublicBusiness,
  PublicService,
} from './types';

/*
 * The public booking API (apps/api/src/booking/booking.controller.ts). No login: every call is
 * unauthenticated and scoped by the business's slug.
 */

const PUBLIC = { authenticated: false } as const;
/** A business offers far fewer than 100 services, and a day has at most 96 slot starts. */
const FIRST_100 = { page: 1, take: 100, order: 'asc' } as const;

const base = (slug: string) => `/public/businesses/${encodeURIComponent(slug)}`;

export function getPublicBusiness(slug: string): Promise<PublicBusiness> {
  return http.get<PublicBusiness>(base(slug), PUBLIC);
}

export async function listPublicServices(slug: string): Promise<PublicService[]> {
  const page = await http.get<Page<PublicService>>(`${base(slug)}/services`, {
    ...PUBLIC,
    query: FIRST_100,
  });
  return page.data;
}

export async function listPublicSlots(
  slug: string,
  query: PublicAvailabilityQuery,
): Promise<Slot[]> {
  const page = await http.get<Page<Slot>>(`${base(slug)}/availability`, {
    ...PUBLIC,
    query: { ...query, ...FIRST_100 },
  });
  return page.data;
}

export function bookPublicAppointment(
  slug: string,
  request: PublicBookingRequest,
): Promise<BookingConfirmation> {
  return http.post<BookingConfirmation>(`${base(slug)}/appointments`, request, PUBLIC);
}
