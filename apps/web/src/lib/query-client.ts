import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/api-error';

const MAX_QUERY_RETRIES = 2;

/** Retry network and server errors, but not 4xx: the same request would fail the same way. */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.isClientError) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetryQuery,
    },
    mutations: {
      retry: false,
    },
  },
});
