import { http } from '@/lib/api/http-client';
import type { Page, PageQuery } from '@/types/api';
import type { Customer } from '@/types/models';

/** Endpoints under /customers (apps/api/src/customers/customers.controller.ts). */

export interface CustomersQuery extends PageQuery {
  /** Matches first name, last name or phone. */
  search?: string;
}

export function listCustomers(query: CustomersQuery): Promise<Page<Customer>> {
  return http.get<Page<Customer>>('/customers', { query: { ...query } });
}
