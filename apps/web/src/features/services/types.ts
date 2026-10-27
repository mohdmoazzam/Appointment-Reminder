import type { PageQuery } from '@/types/api';

/** GET /services and GET /staff/:user_id/services (ListServicesDto) */
export interface ServicesQuery extends PageQuery {
  /** true: only active, false: only inactive, undefined: all. */
  is_active?: boolean;
}

/** POST /services (CreateServiceDto) */
export interface CreateServiceRequest {
  name: string;
  description?: string | null;
  duration_minutes: number;
  /** In the business's currency, up to 2 decimal places. */
  price: number;
  is_active?: boolean;
  /** Staff members who offer the service. */
  staff_ids?: string[];
}

/** PATCH /services/:id (UpdateServiceDto). staff_ids, when sent, replaces the whole list. */
export type UpdateServiceRequest = Partial<CreateServiceRequest>;
