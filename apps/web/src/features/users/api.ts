import { http } from '@/lib/api/http-client';
import type { Page, PageQuery } from '@/types/api';
import type { Session } from '@/types/models';
import type { CurrentUser } from './types';

/** Endpoints under /users (apps/api/src/users/users.controller.ts). */

export function getCurrentUser(): Promise<CurrentUser> {
  return http.get<CurrentUser>('/users/me');
}

export function listSessions(query: PageQuery): Promise<Page<Session>> {
  return http.get<Page<Session>>('/users/me/sessions', { query: { ...query } });
}

export function revokeSession(sessionId: string): Promise<void> {
  return http.delete(`/users/me/sessions/${sessionId}`);
}

/** Revokes every session of the current user, including this one. */
export function logoutAll(): Promise<void> {
  return http.post<void>('/users/me/logout-all');
}
