import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersKeys } from '@/features/users/queries';
import type { PageQuery } from '@/types/api';
import {
  createInvite,
  getStaffMember,
  listInvites,
  listStaff,
  revokeInvite,
  updateStaff,
} from './api';
import type { CreateInviteRequest, UpdateStaffRequest } from './types';

export const staffKeys = {
  all: ['staff'] as const,
  members: () => [...staffKeys.all, 'members'] as const,
  member: (userId: string) => [...staffKeys.members(), 'detail', userId] as const,
  membersPage: (query: PageQuery) => [...staffKeys.members(), query] as const,
  invites: () => [...staffKeys.all, 'invites'] as const,
  invitesPage: (query: PageQuery) => [...staffKeys.invites(), query] as const,
};

export function useStaffMembers(query: PageQuery) {
  return useQuery({
    queryKey: staffKeys.membersPage(query),
    queryFn: () => listStaff(query),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useStaffMember(userId: string) {
  return useQuery({
    queryKey: staffKeys.member(userId),
    queryFn: () => getStaffMember(userId),
  });
}

export function useStaffInvites(query: PageQuery) {
  return useQuery({
    queryKey: staffKeys.invitesPage(query),
    queryFn: () => listInvites(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateInviteRequest) => createInvite(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.invites() }),
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.invites() }),
  });
}

interface UpdateStaffInput {
  userId: string;
  request: UpdateStaffRequest;
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, request }: UpdateStaffInput) => updateStaff(userId, request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.members() }),
        // The change may be to the signed-in user (e.g. an owner making themselves staff).
        queryClient.invalidateQueries({ queryKey: usersKeys.me(), exact: true }),
      ]),
  });
}
