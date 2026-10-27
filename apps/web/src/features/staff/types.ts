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
 * Response of POST /staff/invites. The API emails the invite; `invite_url` is also returned so
 * the owner can share it by hand. Only this response contains it: the API stores just a hash.
 */
export interface CreatedInvite extends StaffInvite {
  invite_url: string;
  /**
   * The invite email is sent in the background: "queued" normally. "failed" or "skipped" means
   * it couldn't be queued, so the owner needs to share `invite_url` themselves.
   */
  email_status: 'queued' | 'sent' | 'failed' | 'skipped';
}

/** PATCH /staff/:user_id (UpdateStaffDto) */
export interface UpdateStaffRequest {
  role?: UserRole;
  status?: UserStatus;
}
