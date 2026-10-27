import type { notification_channel } from './database/prisma/generated/client.js';
import type { NotificationEventPayloadMap } from './dtos/notifications.dto.js';
import { NotificationEventsEnum } from './enums.js';

export interface InAppNotificationMessage {
  title: string;
  body: string;
  /** Web app path to open when it's clicked. */
  link?: string;
}

type InAppResolvers = {
  [E in keyof NotificationEventPayloadMap]?: (payload: NotificationEventPayloadMap[E]) => InAppNotificationMessage;
};

/**
 * The in-app text for each event that has the in_app channel (NotificationChannelsForEvent).
 * A delivery for an event missing here fails with a clear error.
 */
export const InAppNotificationMessageResolver: InAppResolvers = {
  [NotificationEventsEnum.ONLINE_BOOKING_RECEIVED]: (payload) => ({
    title: 'New online booking',
    body: `${payload.customer_name} booked ${payload.service_name} with ${payload.staff_name} for ${payload.when}.`,
    link: '/appointments',
  }),
};

/** One BullMQ queue per channel. */
export const NOTIFICATION_QUEUES = {
  email: 'notifications-email',
  in_app: 'notifications-in_app',
} as const satisfies Record<notification_channel, string>;

/** Retries for a delivery: 5 tries, waiting 10s, 20s, 40s, 80s between them. */
export const NOTIFICATION_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { age: 7 * 24 * 3600 },
  removeOnFail: { age: 30 * 24 * 3600 },
} as const;
