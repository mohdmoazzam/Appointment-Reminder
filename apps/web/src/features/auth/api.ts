import { http } from '@/lib/api/http-client';
import type { AuthTokens } from '@/lib/auth/token-store';
import type { AcceptInviteRequest, InvitePreview, LoginRequest, SignupRequest } from './types';

/** Endpoints under /auth (apps/api/src/auth/auth.controller.ts). */

export function signup(request: SignupRequest): Promise<AuthTokens> {
  return http.post<AuthTokens>('/auth/signup', request, { authenticated: false });
}

export function login(request: LoginRequest): Promise<AuthTokens> {
  return http.post<AuthTokens>('/auth/login', request, { authenticated: false });
}

/** Revokes this device's session. */
export function logout(): Promise<void> {
  return http.post<void>('/auth/logout');
}

export function previewInvite(token: string): Promise<InvitePreview> {
  return http.get<InvitePreview>(`/auth/invites/${encodeURIComponent(token)}`, {
    authenticated: false,
  });
}

export function acceptInvite(token: string, request: AcceptInviteRequest): Promise<AuthTokens> {
  return http.post<AuthTokens>(`/auth/invites/${encodeURIComponent(token)}/accept`, request, {
    authenticated: false,
  });
}
