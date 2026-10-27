import { http } from '@/lib/api/http-client';
import type { Page } from '@/types/api';
import type { Service } from '@/types/models';
import type { CreateServiceRequest, ServicesQuery, UpdateServiceRequest } from './types';

/** Endpoints under /services (apps/api/src/services/services.controller.ts). */

export function listServices(query: ServicesQuery): Promise<Page<Service>> {
  return http.get<Page<Service>>('/services', { query: { ...query } });
}

/** Owner only. */
export function createService(request: CreateServiceRequest): Promise<Service> {
  return http.post<Service>('/services', request);
}

/** Owner only. */
export function updateService(serviceId: string, request: UpdateServiceRequest): Promise<Service> {
  return http.patch<Service>(`/services/${serviceId}`, request);
}

/** Owner only. To hide a service but keep it, set is_active to false instead. */
export function deleteService(serviceId: string): Promise<void> {
  return http.delete(`/services/${serviceId}`);
}

/** Services one staff member offers (GET /staff/:user_id/services). */
export function listStaffServices(userId: string, query: ServicesQuery): Promise<Page<Service>> {
  return http.get<Page<Service>>(`/staff/${userId}/services`, { query: { ...query } });
}

/** Owner only. Replaces the set of services the staff member offers. */
export function setStaffServices(userId: string, serviceIds: string[]): Promise<void> {
  return http.put<void>(`/staff/${userId}/services`, { service_ids: serviceIds });
}
