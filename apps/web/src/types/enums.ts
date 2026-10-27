/*
 * Mirrors the enums in apps/api/src/common/database/prisma/schema.prisma. Each enum is a
 * const array (for building <select> options) plus a type and human-readable labels.
 */

export const BUSINESS_TYPES = ['clinic', 'salon', 'dental', 'coaching', 'other'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  clinic: 'Clinic',
  salon: 'Salon',
  dental: 'Dental office',
  coaching: 'Coaching center',
  other: 'Other',
};

export const USER_ROLES = ['owner', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  staff: 'Staff',
};

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
};

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const APPOINTMENT_STATUSES = [
  'booked',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const APPOINTMENT_SOURCES = ['dashboard', 'online'] as const;
export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];
