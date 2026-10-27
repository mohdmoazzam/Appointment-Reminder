import type { BusinessType } from '@/types/enums';
import type { IsoDateTime } from '@/types/api';
import type { DateOnly } from '@/types/models';
import type { CustomerInput } from '@/features/appointments/types';

/** GET /public/businesses/:slug: what customers may see about the business. */
export interface PublicBusiness {
  name: string;
  slug: string;
  type: BusinessType;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  logo_url: string | null;
  cover_url: string | null;
  /** How many days ahead customers can book. */
  booking_window_days: number;
}

/** A provider as customers see them (no email or account details). */
export interface PublicStaffMember {
  id: string;
  first_name: string;
  last_name: string;
}

/** GET /public/businesses/:slug/services */
export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  staff: PublicStaffMember[];
}

/** GET /public/businesses/:slug/availability */
export interface PublicAvailabilityQuery {
  service_id: string;
  date: DateOnly;
  staff_id?: string;
}

/** POST /public/businesses/:slug/appointments */
export interface PublicBookingRequest {
  service_id: string;
  /** Anyone free at that time when omitted. */
  staff_id?: string;
  starts_at: IsoDateTime;
  customer: CustomerInput;
  notes?: string;
}

/** The booking as confirmed to the customer. */
export interface BookingConfirmation {
  id: string;
  status: string;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  price: string;
  service: { name: string; duration_minutes: number };
  staff: { first_name: string; last_name: string };
  customer: { first_name: string };
}
