import { createContext } from 'react';
import type { AuthTokens } from '@/lib/auth/token-store';
import type { CurrentUser } from '@/features/users/types';

/**
 * - loading:    a session exists and the current user is being fetched
 * - signed-in:  currentUser is available
 * - signed-out: no session (never signed in, signed out, or the session expired)
 * - error:      a session exists but the current user couldn't be loaded (e.g. API down)
 */
export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  /** Set when status is "signed-in". */
  currentUser: CurrentUser | null;
  /** Set when status is "error". */
  error: unknown;
  /** Stores the tokens from login/signup/invite and loads the current user. */
  signIn: (tokens: AuthTokens) => Promise<void>;
  /** Revokes this device's session on the server and clears it locally. */
  signOut: () => Promise<void>;
  /** Retries loading the current user after an error. */
  retry: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
