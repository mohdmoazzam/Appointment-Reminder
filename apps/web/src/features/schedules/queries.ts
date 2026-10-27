import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClosure,
  createTimeOff,
  deleteClosure,
  deleteTimeOff,
  listClosures,
  listTimeOff,
  listWorkingHours,
  setWorkingHours,
  updateClosure,
} from './api';
import type {
  CreateClosureRequest,
  CreateTimeOffRequest,
  DateRangesQuery,
  SetWorkingHoursRequest,
  UpdateClosureRequest,
} from './types';

/** A week has at most 42 intervals (6 a day), so one page of 100 always holds all of them. */
const WHOLE_WEEK = { page: 1, take: 100, order: 'asc' } as const;

export const schedulesKeys = {
  all: ['schedules'] as const,
  workingHours: (userId: string) => [...schedulesKeys.all, 'working-hours', userId] as const,
  timeOff: (userId: string) => [...schedulesKeys.all, 'time-off', userId] as const,
  timeOffPage: (userId: string, query: DateRangesQuery) =>
    [...schedulesKeys.timeOff(userId), query] as const,
  closures: () => [...schedulesKeys.all, 'closures'] as const,
  closuresPage: (query: DateRangesQuery) => [...schedulesKeys.closures(), query] as const,
};

// --- Working hours -------------------------------------------------------------------------------

/** The whole weekly schedule as a flat list of intervals. */
export function useWorkingHours(userId: string) {
  return useQuery({
    queryKey: schedulesKeys.workingHours(userId),
    queryFn: async () => (await listWorkingHours(userId, WHOLE_WEEK)).data,
  });
}

export function useSetWorkingHours(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SetWorkingHoursRequest) => setWorkingHours(userId, request),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: schedulesKeys.workingHours(userId) }),
  });
}

// --- Time off ------------------------------------------------------------------------------------

/** Upcoming and current time off (the API leaves out what has already ended). */
export function useTimeOff(userId: string, query: DateRangesQuery) {
  return useQuery({
    queryKey: schedulesKeys.timeOffPage(userId, query),
    queryFn: () => listTimeOff(userId, query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTimeOff(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateTimeOffRequest) => createTimeOff(userId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKeys.timeOff(userId) }),
  });
}

export function useDeleteTimeOff(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (timeOffId: string) => deleteTimeOff(userId, timeOffId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKeys.timeOff(userId) }),
  });
}

// --- Business closures ---------------------------------------------------------------------------

/** Upcoming and current closures (the API leaves out what has already ended). */
export function useClosures(query: DateRangesQuery) {
  return useQuery({
    queryKey: schedulesKeys.closuresPage(query),
    queryFn: () => listClosures(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateClosureRequest) => createClosure(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKeys.closures() }),
  });
}

interface UpdateClosureInput {
  closureId: string;
  request: UpdateClosureRequest;
}

export function useUpdateClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ closureId, request }: UpdateClosureInput) => updateClosure(closureId, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKeys.closures() }),
  });
}

export function useDeleteClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (closureId: string) => deleteClosure(closureId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schedulesKeys.closures() }),
  });
}
