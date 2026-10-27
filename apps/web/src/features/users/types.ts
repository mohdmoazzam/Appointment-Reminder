import type { Business, User } from '@/types/models';

/** GET /users/me */
export interface CurrentUser {
  user: User;
  business: Business;
}
