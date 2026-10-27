import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { expireSession, onSessionExpired, watchSessionInOtherTabs } from '@/lib/auth/session';
import { tokenStore, type AuthTokens } from '@/lib/auth/token-store';
import { currentUserQueryOptions } from '@/features/users/queries';
import { logout } from '../api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

/**
 * Owns "who is signed in". A stored refresh token means there is a session; the current user
 * (GET /users/me) is then loaded, and the HTTP client restores the access token on that first
 * request. When the session ends for any reason, all cached server data is dropped.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState(() => tokenStore.hasSession());

  const currentUserQuery = useQuery({ ...currentUserQueryOptions(), enabled: hasSession });

  // Expiry can come from anywhere: a rejected refresh, sign-out, "sign out all devices",
  // or another tab. Nothing cached for this account may outlive its session.
  useEffect(() => {
    return onSessionExpired(() => {
      setHasSession(false);
      queryClient.clear();
    });
  }, [queryClient]);

  useEffect(() => {
    return watchSessionInOtherTabs(() => setHasSession(true));
  }, []);

  const signIn = useCallback(
    async (tokens: AuthTokens) => {
      // No cache clearing needed here: signing in only happens while signed out, and the
      // cache was cleared when the previous session ended.
      tokenStore.save(tokens);
      try {
        await queryClient.fetchQuery(currentUserQueryOptions());
      } catch (error) {
        tokenStore.clear();
        throw error;
      }
      setHasSession(true);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Sign out locally regardless. If the request failed, the server-side session stays valid
      // until it expires or is revoked from the Account page on another device.
    }
    expireSession();
  }, []);

  const { refetch } = currentUserQuery;
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const status = deriveStatus(hasSession, currentUserQuery);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      currentUser: status === 'signed-in' ? (currentUserQuery.data ?? null) : null,
      error: status === 'error' ? currentUserQuery.error : null,
      signIn,
      signOut,
      retry,
    }),
    [status, currentUserQuery.data, currentUserQuery.error, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function deriveStatus(
  hasSession: boolean,
  query: { isPending: boolean; isError: boolean; data: unknown },
): AuthStatus {
  if (!hasSession) return 'signed-out';
  // Once loaded, a failed background refetch keeps the user signed in with the cached data.
  if (query.data) return 'signed-in';
  if (query.isError) return 'error';
  return 'loading';
}
