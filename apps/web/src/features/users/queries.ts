import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { expireSession } from '@/lib/auth/session';
import type { PageQuery } from '@/types/api';
import { getCurrentUser, listSessions, logoutAll, revokeSession } from './api';

export const usersKeys = {
  all: ['users'] as const,
  me: () => [...usersKeys.all, 'me'] as const,
  sessions: () => [...usersKeys.me(), 'sessions'] as const,
  sessionsPage: (query: PageQuery) => [...usersKeys.sessions(), query] as const,
};

/** The signed-in user and their business. Read through useAuth / useCurrentUser in components. */
export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: usersKeys.me(),
    queryFn: getCurrentUser,
    staleTime: 5 * 60_000,
  });
}

export function useSessions(query: PageQuery) {
  return useQuery({
    queryKey: usersKeys.sessionsPage(query),
    queryFn: () => listSessions(query),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.sessions() }),
  });
}

/** Signs out every device. This one included, so the local session is expired afterwards. */
export function useLogoutAll() {
  return useMutation({
    mutationFn: logoutAll,
    onSuccess: () => expireSession(),
  });
}
