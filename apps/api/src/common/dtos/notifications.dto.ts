import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import type { notification_channel, notification_delivery_status } from '../database/prisma/generated/client.js';
import type { InAppNotificationResponse } from '../database/selects.js';
import type { NotificationEventsEnum } from '../enums.js';
import { PageOptionsDto } from './common.dto.js';

// --- Events and their payloads ----------------------------------------------------------------

/**
 * Payload values are plain strings and numbers: email templates use them as {{placeholders}},
 * so format dates etc. (in the business's time zone) before queueing.
 */
type NotificationPayload = Record<string, string | number>;

export interface StaffInvitePayload extends NotificationPayload {
  first_name: string;
  business_name: string;
  invited_by: string;
  invite_url: string;
  expires_in_days: number;
}

export interface OnlineBookingReceivedPayload extends NotificationPayload {
  appointment_id: string;
  customer_name: string;
  service_name: string;
  staff_name: string;
  /** e.g. "Mon, Nov 2 at 10:30 AM", in the business's time zone. */
  when: string;
}

/** Each event's payload. Every NotificationEventsEnum value needs an entry (checked below). */
export interface NotificationEventPayloadMap {
  [NotificationEventsEnum.STAFF_INVITE]: StaffInvitePayload;
  [NotificationEventsEnum.ONLINE_BOOKING_RECEIVED]: OnlineBookingReceivedPayload;
}

export type NotificationEventType = keyof NotificationEventPayloadMap;

// Fails to compile when an event is added to the enum without a payload here.
type EventsWithoutPayload = Exclude<NotificationEventsEnum, NotificationEventType>;
export const ALL_EVENTS_HAVE_PAYLOADS: [EventsWithoutPayload] extends [never] ? true : EventsWithoutPayload = true;

// --- Queueing ---------------------------------------------------------------------------------

/**
 * Who to notify. Signed-in users: give user_id, email and name. Anonymous people (e.g. someone
 * invited who has no account yet): give only email and name.
 */
export interface NotificationRecipient {
  user_id?: string;
  email?: string | null;
  name?: string | null;
}

export interface QueueNotificationInput<E extends NotificationEventType> {
  event: E;
  payload: NotificationEventPayloadMap[E];
  recipients: NotificationRecipient[];
  /** Required for in-app notifications (they belong to a business). */
  business_id?: string;
  /** Unique per real-world occurrence, e.g. `staff_invite:<invite id>`; repeats are ignored. */
  idempotency_key: string;
  /** Where email replies go; defaults to the no-reply sender. */
  reply_to?: { email: string; name?: string };
}

export interface QueuedNotification {
  event_id: string;
  /** True when this idempotency key was already queued; nothing new was sent. */
  duplicate: boolean;
  deliveries: { id: string; channel: notification_channel; status: notification_delivery_status }[];
}

/** BullMQ job data on each channel queue. */
export interface NotificationJobData {
  delivery_id: string;
}

// --- In-app notifications API -----------------------------------------------------------------

export class ListNotificationsDto extends PageOptionsDto {
  @ApiPropertyOptional({ default: false, description: 'Only notifications not yet read' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  readonly unread_only: boolean = false;
}

// --- Live stream (GET /notifications/stream) --------------------------------------------------

/**
 * Pushed to the recipient's open streams. Sent as server-sent events named by `type`, with the
 * whole object as JSON data.
 */
export type NotificationStreamEvent =
  | { type: 'notification.created'; notification: InAppNotificationResponse }
  /** Marked read, possibly from another tab or device; `all` for "mark all as read". */
  | { type: 'notification.read'; ids: string[] | 'all' };
