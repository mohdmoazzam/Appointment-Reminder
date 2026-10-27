import type { Prisma } from './prisma/generated/client.js';
import { Helper } from '../helper.js';

/** User columns that are safe to return from the API (no password_hash). */
export const userSelect = {
  id: true,
  business_id: true,
  email: true,
  first_name: true,
  last_name: true,
  role: true,
  status: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.usersSelect;

export type PublicUser = Prisma.usersGetPayload<{ select: typeof userSelect }>;

/** Asset columns returned from the API (the Cloudinary public_id stays internal). */
export const assetSelect = {
  id: true,
  business_id: true,
  uploaded_by_id: true,
  url: true,
  mime_type: true,
  format: true,
  bytes: true,
  width: true,
  height: true,
  original_name: true,
  created_at: true,
} satisfies Prisma.assetsSelect;

/** Include this when loading a business so toBusinessResponse can resolve the logo URL. */
export const businessInclude = {
  logo_asset: { select: { url: true } },
} satisfies Prisma.businessesInclude;

type BusinessWithLogo = Prisma.businessesGetPayload<{ include: typeof businessInclude }>;

export type BusinessResponse = Omit<BusinessWithLogo, 'logo_asset'> & { logo_url: string | null };

export function toBusinessResponse({ logo_asset, ...business }: BusinessWithLogo): BusinessResponse {
  return { ...business, logo_url: logo_asset?.url ?? null };
}

/** A staff member as shown inside other resources (e.g. who offers a service). */
export const staffSummarySelect = {
  id: true,
  first_name: true,
  last_name: true,
  status: true,
} satisfies Prisma.usersSelect;

/** Include this when loading a service so toServiceResponse can list its staff. */
export const serviceInclude = {
  staff_services: {
    select: { user: { select: staffSummarySelect } },
    orderBy: [{ user: { first_name: 'asc' } }, { user: { last_name: 'asc' } }],
  },
} satisfies Prisma.servicesInclude;

type ServiceWithStaff = Prisma.servicesGetPayload<{ include: typeof serviceInclude }>;

/** `price` is a string with 2 decimals ("450.00") so no precision is lost in JSON. */
export function toServiceResponse({ staff_services, price, ...service }: ServiceWithStaff) {
  return {
    ...service,
    price: price.toFixed(2),
    staff: staff_services.map((link) => link.user),
  };
}

export type ServiceResponse = ReturnType<typeof toServiceResponse>;

/** Minutes after midnight are stored; "HH:mm" is returned. */
export function toWorkingHoursResponse(row: Prisma.working_hoursGetPayload<object>) {
  return {
    id: row.id,
    day_of_week: row.day_of_week,
    start_time: Helper.minutesToTimeOfDay(row.start_minute),
    end_time: Helper.minutesToTimeOfDay(row.end_minute),
  };
}

/** DATE columns are returned as "YYYY-MM-DD". */
export function toTimeOffResponse(row: Prisma.staff_time_offGetPayload<object>) {
  return {
    id: row.id,
    user_id: row.user_id,
    starts_on: Helper.formatDateOnly(row.starts_on),
    ends_on: Helper.formatDateOnly(row.ends_on),
    reason: row.reason,
    created_at: row.created_at,
  };
}

export function toClosureResponse(row: Prisma.business_closuresGetPayload<object>) {
  return {
    id: row.id,
    name: row.name,
    starts_on: Helper.formatDateOnly(row.starts_on),
    ends_on: Helper.formatDateOnly(row.ends_on),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Customer columns returned from the API. */
export const customerSelect = {
  id: true,
  first_name: true,
  last_name: true,
  phone: true,
  email: true,
  notes: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.customersSelect;

/** Include this when loading an appointment so toAppointmentResponse can describe it fully. */
export const appointmentInclude = {
  service: { select: { id: true, name: true, duration_minutes: true } },
  staff: { select: staffSummarySelect },
  customer: { select: customerSelect },
} satisfies Prisma.appointmentsInclude;

type AppointmentWithDetails = Prisma.appointmentsGetPayload<{ include: typeof appointmentInclude }>;

/** `price` is a string with 2 decimals, like services. Internal ids already in the nested objects are left out. */
export function toAppointmentResponse(appointment: AppointmentWithDetails) {
  const { price, service_id: _service_id, staff_id: _staff_id, customer_id: _customer_id, ...rest } = appointment;
  return { ...rest, price: price.toFixed(2) };
}

export type AppointmentResponse = ReturnType<typeof toAppointmentResponse>;

/** What the public booking page may show about a business (no ids of staff accounts, no emails). */
export const publicBusinessSelect = {
  name: true,
  slug: true,
  type: true,
  phone: true,
  address_line1: true,
  address_line2: true,
  city: true,
  state: true,
  postal_code: true,
  country: true,
  timezone: true,
  currency: true,
  logo_asset: { select: { url: true } },
} satisfies Prisma.businessesSelect;

type PublicBusinessRow = Prisma.businessesGetPayload<{ select: typeof publicBusinessSelect }>;

export function toPublicBusinessResponse({ logo_asset, ...business }: PublicBusinessRow) {
  return { ...business, logo_url: logo_asset?.url ?? null };
}
