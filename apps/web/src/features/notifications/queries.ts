import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationsQuery } from './api';

export const notificationsKeys = {
  all: ['notifications'] as const,
  list: (query: NotificationsQuery) => [...notificationsKeys.all, 'list', query] as const,
  unreadCount: () => [...notificationsKeys.all, 'unread-count'] as const,
};

/** How many the bell's panel shows. */
const RECENT_NOTIFICATIONS: NotificationsQuery = { take: 10, order: 'desc' };

// The live stream (useNotificationStream) invalidates these when something changes, so they
// don't need polling.

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: getUnreadCount,
    select: (data) => data.count,
  });
}

export function useRecentNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationsKeys.list(RECENT_NOTIFICATIONS),
    queryFn: () => listNotifications(RECENT_NOTIFICATIONS),
    enabled,
  });
}

/** A page of the full history, for the Notifications page. */
export function useNotifications(query: NotificationsQuery) {
  return useQuery({
    queryKey: notificationsKeys.list(query),
    queryFn: () => listNotifications(query),
    placeholderData: keepPreviousData,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
  });
}
