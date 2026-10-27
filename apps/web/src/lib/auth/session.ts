import { ApiError } from '@/lib/api/api-error';
import { buildApiUrl } from '@/lib/api/url';
import {
  SESSION_STORAGE_KEY,
  parseStoredSession,
  tokenStore,
  type AuthTokens,
} from './token-store';

/*
 * Session lifecycle shared by the HTTP client and the AuthProvider:
 *  - refreshSession(): trade the refresh token for new tokens
 *  - expireSession(): forget the tokens and tell the UI the user is signed out
 *  - watchSessionInOtherTabs(): follow logouts / account switches made in other tabs
 *
 * This module talks to /auth/refresh with fetch directly (not through http-client) because
 * http-client itself depends on this module.
 */

/** Name of the Web Lock that serialises refreshes across tabs. */
const REFRESH_LOCK_NAME = 'appointment-reminder.refresh-session';

type SessionExpiredListener = () => void;

const expiredListeners = new Set<SessionExpiredListener>();
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the stored refresh token for a new access + refresh token pair.
 *
 * Resolves true when new tokens were stored, false when the session is gone (no refresh token,
 * or the server rejected it) – in that case the session has already been expired. Rejects with
 * an ApiError on network or server errors, which leaves the session in place so it can be
 * retried.
 *
 * The API rotates refresh tokens and revokes the whole session if an already-rotated token is
 * used again. So concurrent callers in this tab share one request, and tabs take turns through
 * a Web Lock; each turn re-reads the token from storage, picking up any rotation made by the
 * tab before it.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= withCrossTabLock(rotateTokens).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function rotateTokens(): Promise<boolean> {
  const stored = tokenStore.getStoredSession();
  if (!stored) {
    expireSession();
    return false;
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: stored.refresh_token }),
    });
  } catch {
    throw ApiError.network();
  }

  if (response.status === 401) {
    expireSession();
    return false;
  }
  if (!response.ok) throw await ApiError.fromResponse(response);

  const tokens = (await response.json()) as AuthTokens;
  tokenStore.save(tokens);
  return true;
}

function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  // Web Locks only exist in secure contexts (https or localhost).
  if (!('locks' in navigator) || !navigator.locks) return task();
  return navigator.locks.request(REFRESH_LOCK_NAME, task);
}

/** Forgets all tokens in this tab and storage, then notifies listeners (the AuthProvider). */
export function expireSession(): void {
  tokenStore.clear();
  notifyExpired();
}

/** Subscribes to session expiry. Returns an unsubscribe function. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function notifyExpired(): void {
  for (const listener of expiredListeners) listener();
}

/**
 * Keeps this tab in step with the others (they share localStorage):
 *  - signed out elsewhere (session removed)    → sign out here too
 *  - signed in elsewhere while signed out here → onSignedInElsewhere (pick up the session)
 *  - a different user signed in elsewhere      → reload, so no data from the old account is
 *                                                 shown under the new account's tokens
 *  - same user, rotated refresh token          → nothing to do; it is read fresh on refresh
 *
 * Returns an unsubscribe function.
 */
export function watchSessionInOtherTabs(onSignedInElsewhere: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_STORAGE_KEY) return;

    const previous = parseStoredSession(event.oldValue);
    const next = parseStoredSession(event.newValue);

    if (!next) {
      tokenStore.clearAccessToken();
      notifyExpired();
    } else if (!previous) {
      onSignedInElsewhere();
    } else if (previous.user_id !== next.user_id) {
      window.location.reload();
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
