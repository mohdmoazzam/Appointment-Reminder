import type { IsoDateTime } from './api';
import type {
  AppointmentSource,
  AppointmentStatus,
  BusinessType,
  UserRole,
  UserStatus,
} from './enums';

/*
 * Entities as the API returns them. Keep in sync with
 * apps/api/src/common/database/selects.ts.
 */

/** userSelect: a user without the password hash. */
export interface User {
  id: string;
  business_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** BusinessResponse: the business row with the logo resolved to a URL. */
export interface Business {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  /** ISO 3166-1 alpha-2, e.g. "IN". */
  country: string | null;
  /** IANA time zone, e.g. "Asia/Kolkata". */
  timezone: string;
  /** ISO 4217 code for service prices, e.g. "INR". */
  currency: string;
  logo_asset_id: string | null;
  logo_url: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** assetSelect: an uploaded file. */
export interface Asset {
  id: string;
  business_id: string;
  uploaded_by_id: string;
  url: string;
  mime_type: string;
  format: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  original_name: string | null;
  created_at: IsoDateTime;
}

/** A pending staff invite (not accepted, not expired). */
export interface StaffInvite {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  invited_by_id: string;
  expires_at: IsoDateTime;
  created_at: IsoDateTime;
}

/** One logged-in device of the current user. */
export interface Session {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: IsoDateTime;
  last_used_at: IsoDateTime;
  expires_at: IsoDateTime;
  /** True for the session making the request, i.e. this browser. */
  current: boolean;
}

/** A calendar date without a time, as the API sends it: "2026-12-25". */
export type DateOnly = string;

/** A time of day, 24-hour "HH:mm" in the business's time zone: "09:30". */
export type TimeOfDay = string;

/** A staff member as shown inside other resources (e.g. who offers a service). */
export interface StaffSummary {
  id: string;
  first_name: string;
  last_name: string;
  status: UserStatus;
}

/** toServiceResponse: something customers book. */
export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  /** Decimal string with 2 places ("450.00"), in the business's currency. */
  price: string;
  is_active: boolean;
  staff: StaffSummary[];
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** One working interval of a staff member's week; gaps between intervals are breaks. */
export interface WorkingHoursInterval {
  id: string;
  /** 0 = Sunday … 6 = Saturday */
  day_of_week: number;
  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

/** Whole days a staff member is away; ends_on is inclusive. */
export interface TimeOff {
  id: string;
  user_id: string;
  starts_on: DateOnly;
  ends_on: DateOnly;
  reason: string | null;
  created_at: IsoDateTime;
}

/** Days the whole business is closed (holidays); ends_on is inclusive. */
export interface BusinessClosure {
  id: string;
  name: string;
  starts_on: DateOnly;
  ends_on: DateOnly;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** customerSelect: someone who books. One per phone number per business. */
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  /** Normalised: "+919876543210". */
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** toAppointmentResponse */
export interface Appointment {
  id: string;
  business_id: string;
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  status: AppointmentStatus;
  source: AppointmentSource;
  /** Price when booked, 2 decimals, in the business's currency. */
  price: string;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: IsoDateTime | null;
  /** Null for online bookings. */
  created_by_id: string | null;
  service: { id: string; name: string; duration_minutes: number };
  staff: StaffSummary;
  customer: Customer;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** A bookable start time and the staff members free for the whole service then. */
export interface Slot {
  starts_at: IsoDateTime;
  ends_at: IsoDateTime;
  /** "HH:mm" in the business's time zone. */
  start_time: TimeOfDay;
  staff_ids: string[];
}
