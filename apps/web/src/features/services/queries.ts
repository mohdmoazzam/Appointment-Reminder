import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffKeys } from '@/features/staff/queries';
import {
  createService,
  deleteService,
  listServices,
  listStaffServices,
  setStaffServices,
  updateService,
} from './api';
import type { CreateServiceRequest, ServicesQuery, UpdateServiceRequest } from './types';

export const servicesKeys = {
  all: ['services'] as const,
  lists: () => [...servicesKeys.all, 'list'] as const,
  list: (query: ServicesQuery) => [...servicesKeys.lists(), query] as const,
};

export function useServices(query: ServicesQuery) {
  return useQuery({
    queryKey: servicesKeys.list(query),
    queryFn: () => listServices(query),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/**
 * A service change can also change which services a staff member offers (staff_ids), so the
 * per-staff lists are refreshed too.
 */
function useInvalidateServices() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: servicesKeys.all }),
      queryClient.invalidateQueries({ queryKey: staffKeys.all }),
    ]);
}

export function useCreateService() {
  const invalidate = useInvalidateServices();
  return useMutation({
    mutationFn: (request: CreateServiceRequest) => createService(request),
    onSuccess: invalidate,
  });
}

interface UpdateServiceInput {
  serviceId: string;
  request: UpdateServiceRequest;
}

export function useUpdateService() {
  const invalidate = useInvalidateServices();
  return useMutation({
    mutationFn: ({ serviceId, request }: UpdateServiceInput) => updateService(serviceId, request),
    onSuccess: invalidate,
  });
}

// --- Services one staff member offers ------------------------------------------------------------

/** The API caps page size at 100; far more services than any business offers. */
const ALL_SERVICES = { page: 1, take: 100, order: 'asc' } as const;

/** Every service of the business (active and inactive), for pickers. */
export function useAllServices() {
  return useServices(ALL_SERVICES);
}

/** Ids of the services a staff member offers. */
export function useStaffServiceIds(userId: string) {
  return useQuery({
    queryKey: [...staffKeys.member(userId), 'services'] as const,
    queryFn: async () =>
      (await listStaffServices(userId, ALL_SERVICES)).data.map((service) => service.id),
  });
}

export function useSetStaffServices(userId: string) {
  const invalidate = useInvalidateServices();
  return useMutation({
    mutationFn: (serviceIds: string[]) => setStaffServices(userId, serviceIds),
    onSuccess: invalidate,
  });
}

export function useDeleteService() {
  const invalidate = useInvalidateServices();
  return useMutation({
    mutationFn: (serviceId: string) => deleteService(serviceId),
    onSuccess: invalidate,
  });
}
