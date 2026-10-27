import type { BusinessType } from '@/types/enums';

/**
 * PATCH /business (UpdateBusinessDto). Every field is optional; name, type and timezone can't
 * be cleared, the others accept null to clear them.
 */
export interface UpdateBusinessRequest {
  name?: string;
  type?: BusinessType;
  timezone?: string;
  /** ISO 4217, e.g. "INR". Can't be cleared. */
  currency?: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  /** An image uploaded via POST /assets/upload; null removes the logo. */
  logo_asset_id?: string | null;
}
