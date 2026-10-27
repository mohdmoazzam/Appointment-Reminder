import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listCustomers, type CustomersQuery } from './api';

export const customersKeys = {
  all: ['customers'] as const,
  list: (query: CustomersQuery) => [...customersKeys.all, 'list', query] as const,
};

/** Minimum characters before searching, so one letter doesn't list everybody. */
export const MIN_CUSTOMER_SEARCH_LENGTH = 2;

/** Search as you type, by name or phone. */
export function useCustomerSearch(search: string) {
  const term = search.trim();
  const query: CustomersQuery = { search: term, take: 8, order: 'asc' };
  return useQuery({
    queryKey: customersKeys.list(query),
    queryFn: () => listCustomers(query),
    enabled: term.length >= MIN_CUSTOMER_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  });
}
