import { useMutation, useQuery } from '@tanstack/react-query';
import { acceptInvite, login, previewInvite, signup } from './api';
import { useAuth } from './context/use-auth';
import type { AcceptInviteRequest, LoginRequest, SignupRequest } from './types';

export const authKeys = {
  all: ['auth'] as const,
  invite: (token: string) => [...authKeys.all, 'invite', token] as const,
};

/** Each of these mutations also signs the user in, so isPending covers loading the user too. */

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: async (request: LoginRequest) => signIn(await login(request)),
  });
}

export function useSignup() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: async (request: SignupRequest) => signIn(await signup(request)),
  });
}

export function useAcceptInvite(token: string) {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: async (request: AcceptInviteRequest) => signIn(await acceptInvite(token, request)),
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: authKeys.invite(token),
    queryFn: () => previewInvite(token),
  });
}
