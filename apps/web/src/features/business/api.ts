import { http } from '@/lib/api/http-client';
import type { Business } from '@/types/models';
import type { UpdateBusinessRequest } from './types';

/** Endpoints under /business (apps/api/src/business/business.controller.ts). */

export function getBusiness(): Promise<Business> {
  return http.get<Business>('/business');
}

/** Owner only. */
export function updateBusiness(request: UpdateBusinessRequest): Promise<Business> {
  return http.patch<Business>('/business', request);
}
