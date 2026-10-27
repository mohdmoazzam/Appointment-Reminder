import { notification_channel } from './database/prisma/generated/client.js';

/**
 * Everything the app notifies people about. To add one, see "Adding a new notification event"
 * in common/services/notification.service.ts.
 */
export enum NotificationEventsEnum {
  /** An owner invited someone to join their business (email to the invitee, who has no account yet). */
  STAFF_INVITE = 'staff_invite',
  /** A customer booked on the public booking page (in-app to the staff member and the owners). */
  ONLINE_BOOKING_RECEIVED = 'online_booking_received',
}

/** The channels each event may be sent on. queueNotification only creates deliveries for these. */
export const NotificationChannelsForEvent: Record<NotificationEventsEnum, notification_channel[]> = {
  [NotificationEventsEnum.STAFF_INVITE]: [notification_channel.email],
  [NotificationEventsEnum.ONLINE_BOOKING_RECEIVED]: [notification_channel.in_app],
};
