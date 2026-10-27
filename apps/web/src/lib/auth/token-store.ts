/** Returned by signup, login, invite accept and refresh. `id` is the user's id. */
export interface AuthTokens {
  id: string;
  access_token: string;
  refresh_token: string;
}

/** What survives a page reload. The access token is never written to storage. */
export interface StoredSession {
  user_id: string;
  refresh_token: string;
}

export const SESSION_STORAGE_KEY = 'appointment-reminder.session';

/** Short-lived (15 min) and kept in memory only, so it is gone after a reload. */
let accessToken: string | null = null;

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getStoredSession(): StoredSession | null {
    return parseStoredSession(readStorage());
  },

  hasSession(): boolean {
    return this.getStoredSession() !== null;
  },

  save(tokens: AuthTokens): void {
    accessToken = tokens.access_token;
    const session: StoredSession = { user_id: tokens.id, refresh_token: tokens.refresh_token };
    writeStorage(JSON.stringify(session));
  },

  /** Forgets the access token but keeps the stored session (used when another tab logs out). */
  clearAccessToken(): void {
    accessToken = null;
  },

  clear(): void {
    accessToken = null;
    writeStorage(null);
  },
};

/** Parses the stored JSON; anything malformed is treated as "no session". */
export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof value.user_id === 'string' && typeof value.refresh_token === 'string') {
      return { user_id: value.user_id, refresh_token: value.refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

// localStorage can throw (storage disabled, quota exceeded); the app then behaves as if
// nothing was stored, which only means the user has to sign in again after a reload.

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(SESSION_STORAGE_KEY);
    else window.localStorage.setItem(SESSION_STORAGE_KEY, value);
  } catch {
    // See comment above readStorage.
  }
}
