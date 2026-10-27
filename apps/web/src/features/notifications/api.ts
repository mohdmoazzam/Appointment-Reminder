import { http } from '@/lib/api/http-client';
import type { Page, PageQuery } from '@/types/api';
import type { InAppNotification } from '@/types/models';

/** Endpoints under /notifications (apps/api/src/notifications/notifications.controller.ts). */

export interface NotificationsQuery extends PageQuery {
  unread_only?: boolean;
}

export function listNotifications(query: NotificationsQuery): Promise<Page<InAppNotification>> {
  return http.get<Page<InAppNotification>>('/notifications', { query: { ...query } });
}

export function getUnreadCount(): Promise<{ count: number }> {
  return http.get<{ count: number }>('/notifications/unread-count');
}

export function markNotificationRead(notificationId: string): Promise<InAppNotification> {
  return http.post<InAppNotification>(`/notifications/${encodeURIComponent(notificationId)}/read`);
}

export function markAllNotificationsRead(): Promise<void> {
  return http.post<void>('/notifications/read-all');
}

/** Path of the live stream; read with useNotificationStream. */
export const NOTIFICATION_STREAM_PATH = '/notifications/stream';

/** NotificationStreamEvent in the API: the JSON data of each event on the stream. */
export type NotificationStreamEvent =
  { type: 'notification.created'; notification: InAppNotification } | { type: 'notification.read'; ids: string[] | 'all' };
