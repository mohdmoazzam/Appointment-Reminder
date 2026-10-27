import { http } from '@/lib/api/http-client';
import type { Page, PageQuery } from '@/types/api';
import type { StaffInvite, User } from '@/types/models';
import type { CreateInviteRequest, CreatedInvite, UpdateStaffRequest } from './types';

/** Endpoints under /staff (apps/api/src/staff/staff.controller.ts). */

/** Everyone in the business, active and disabled. */
export function listStaff(query: PageQuery): Promise<Page<User>> {
  return http.get<Page<User>>('/staff', { query: { ...query } });
}

/** Invites that are neither accepted nor expired. */
export function listInvites(query: PageQuery): Promise<Page<StaffInvite>> {
  return http.get<Page<StaffInvite>>('/staff/invites', { query: { ...query } });
}

/** Owner only. Replaces any pending invite for the same email, so only the newest link works. */
export function createInvite(request: CreateInviteRequest): Promise<CreatedInvite> {
  return http.post<CreatedInvite>('/staff/invites', request);
}

/** Owner only. */
export function revokeInvite(inviteId: string): Promise<void> {
  return http.delete(`/staff/invites/${inviteId}`);
}

/** Owner only. Disabling a user also signs them out everywhere. */
export function updateStaff(userId: string, request: UpdateStaffRequest): Promise<User> {
  return http.patch<User>(`/staff/${userId}`, request);
}

export function getStaffMember(userId: string): Promise<User> {
  return http.get<User>(`/staff/${userId}`);
}
