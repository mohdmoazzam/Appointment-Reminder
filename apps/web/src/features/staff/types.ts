import type { UserRole, UserStatus } from '@/types/enums';
import type { StaffInvite } from '@/types/models';

/** POST /staff/invites (CreateInviteDto) */
export interface CreateInviteRequest {
  email: string;
  first_name: string;
  last_name: string;
  /** Defaults to "staff" on the API. */
  role?: UserRole;
}

/**
 * Response of POST /staff/invites. There is no email service yet, so the owner shares
 * `invite_url` themselves. Only this response contains it: the API stores just a hash.
 */
export interface CreatedInvite extends StaffInvite {
  invite_url: string;
}

/** PATCH /staff/:user_id (UpdateStaffDto) */
export interface UpdateStaffRequest {
  role?: UserRole;
  status?: UserStatus;
}
