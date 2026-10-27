import type { IsoDateTime } from '@/types/api';
import type { BusinessType, UserRole } from '@/types/enums';

/** POST /auth/signup (SignupDto) */
export interface SignupRequest {
  business: {
    name: string;
    type: BusinessType;
    timezone: string;
    phone?: string;
  };
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
  };
}

/** POST /auth/login (LoginDto) */
export interface LoginRequest {
  email: string;
  password: string;
}

/** GET /auth/invites/:token */
export interface InvitePreview {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  expires_at: IsoDateTime;
  business: { name: string };
}

/** POST /auth/invites/:token/accept (AcceptInviteDto) */
export interface AcceptInviteRequest {
  password: string;
  /** Overrides the name the owner entered on the invite. */
  first_name?: string;
  last_name?: string;
}
