import type { Location } from 'react-router';
import { paths } from '@/app/paths';

/** Router state RequireAuth attaches when it sends a signed-out user to the login page. */
export interface LoginRedirectState {
  from: string;
}

export function loginRedirectState(location: Location): LoginRedirectState {
  return { from: `${location.pathname}${location.search}${location.hash}` };
}

/**
 * Where to go after signing in: the page the user originally asked for, or the dashboard.
 * Only same-app paths are accepted ("/staff", not "//evil.example" or "https://...").
 */
export function redirectTargetAfterLogin(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from: unknown }).from;
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from;
  }
  return paths.dashboard;
}
