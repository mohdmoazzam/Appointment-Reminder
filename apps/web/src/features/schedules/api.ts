import { http } from '@/lib/api/http-client';
import type { Page, PageQuery } from '@/types/api';
import type { BusinessClosure, TimeOff, WorkingHoursInterval } from '@/types/models';
import type {
  CreateClosureRequest,
  CreateTimeOffRequest,
  DateRangesQuery,
  SetWorkingHoursRequest,
  UpdateClosureRequest,
} from './types';

/*
 * Endpoints of the API's schedules module:
 *   /staff/:user_id/working-hours, /staff/:user_id/time-off (staff-schedule.controller.ts)
 *   /closures (closures.controller.ts)
 * Reads are open to everyone in the business; writes are owner only.
 */

// --- Working hours -------------------------------------------------------------------------------

export function listWorkingHours(
  userId: string,
  query: PageQuery,
): Promise<Page<WorkingHoursInterval>> {
  return http.get<Page<WorkingHoursInterval>>(`/staff/${userId}/working-hours`, {
    query: { ...query },
  });
}

export function setWorkingHours(userId: string, request: SetWorkingHoursRequest): Promise<void> {
  return http.put<void>(`/staff/${userId}/working-hours`, request);
}

// --- Time off ------------------------------------------------------------------------------------

export function listTimeOff(userId: string, query: DateRangesQuery): Promise<Page<TimeOff>> {
  return http.get<Page<TimeOff>>(`/staff/${userId}/time-off`, { query: { ...query } });
}

export function createTimeOff(userId: string, request: CreateTimeOffRequest): Promise<TimeOff> {
  return http.post<TimeOff>(`/staff/${userId}/time-off`, request);
}

export function deleteTimeOff(userId: string, timeOffId: string): Promise<void> {
  return http.delete(`/staff/${userId}/time-off/${timeOffId}`);
}

// --- Business closures ---------------------------------------------------------------------------

export function listClosures(query: DateRangesQuery): Promise<Page<BusinessClosure>> {
  return http.get<Page<BusinessClosure>>('/closures', { query: { ...query } });
}

export function createClosure(request: CreateClosureRequest): Promise<BusinessClosure> {
  return http.post<BusinessClosure>('/closures', request);
}

export function updateClosure(
  closureId: string,
  request: UpdateClosureRequest,
): Promise<BusinessClosure> {
  return http.patch<BusinessClosure>(`/closures/${closureId}`, request);
}

export function deleteClosure(closureId: string): Promise<void> {
  return http.delete(`/closures/${closureId}`);
}
