import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { NOTIFICATION_JOB_OPTIONS, NOTIFICATION_QUEUES } from '../constants.js';
import { PrismaService } from '../database/prisma.service.js';
import type { notification_channel, notification_delivery_status, Prisma } from '../database/prisma/generated/client.js';
import type {
  NotificationEventType,
  NotificationJobData,
  NotificationRecipient,
  QueuedNotification,
  QueueNotificationInput,
} from '../dtos/notifications.dto.js';
import { NotificationChannelsForEvent } from '../enums.js';
import { Helper } from '../helper.js';

/**
 * The one way the app tells people things (emails, in-app notifications, later WhatsApp/SMS).
 *
 * Flow:
 * 1. A feature calls queueNotification with an event, its payload and the recipients.
 * 2. This records the event and one delivery per recipient and channel, after checking each
 *    recipient can be reached on that channel (otherwise the delivery is `skipped`, with why).
 * 3. Each delivery is queued on its channel's BullMQ queue.
 * 4. The channel's processor (notifications/processors) renders it, sends it and logs every
 *    attempt; failed attempts are retried with backoff.
 *
 * Adding a new notification event (no changes here or in the processors):
 * 1. Add it to NotificationEventsEnum and NotificationChannelsForEvent (common/enums.ts).
 * 2. Add its payload to NotificationEventPayloadMap (common/dtos/notifications.dto.ts).
 * 3. Email: add a default template (is_default, type = the event) to email_templates in a migration.
 * 4. In-app: add its message to InAppNotificationMessageResolver (common/constants.ts).
 * 5. Call queueNotification with a unique idempotency_key, e.g. `<event>:<record id>`.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly queues: Record<notification_channel, Queue<NotificationJobData>>;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUES.email) emailQueue: Queue<NotificationJobData>,
    @InjectQueue(NOTIFICATION_QUEUES.in_app) inAppQueue: Queue<NotificationJobData>,
  ) {
    this.queues = { email: emailQueue, in_app: inAppQueue };
  }

  async queueNotification<E extends NotificationEventType>(input: QueueNotificationInput<E>): Promise<QueuedNotification> {
    const existing = await this.findByIdempotencyKey(input.idempotency_key);
    if (existing) return existing;

    const deliveries = await this.planDeliveries(input);
    let event;
    try {
      event = await this.prisma.notification_events.create({
        data: {
          business_id: input.business_id ?? null,
          event: input.event,
          payload: input.payload as Prisma.InputJsonObject,
          idempotency_key: input.idempotency_key,
          reply_to_email: input.reply_to?.email ?? null,
          reply_to_name: input.reply_to?.name ?? null,
          deliveries: { create: deliveries },
        },
        select: { id: true, deliveries: { select: { id: true, channel: true, status: true } } },
      });
    } catch (error) {
      // Lost a race with the same key: the other call queued it.
      if (Helper.isUniqueViolation(error)) {
        const raced = await this.findByIdempotencyKey(input.idempotency_key);
        if (raced) return raced;
      }
      throw error;
    }

    const queued = await Promise.all(event.deliveries.map((delivery) => this.enqueue(delivery)));
    return { event_id: event.id, duplicate: false, deliveries: queued };
  }

  /** One delivery per channel the event allows and recipient, skipped when it can't be sent. */
  private async planDeliveries<E extends NotificationEventType>(input: QueueNotificationInput<E>) {
    const channels = NotificationChannelsForEvent[input.event];
    const recipients = dedupeRecipients(input.recipients);

    const userIds = recipients.flatMap((recipient) => (recipient.user_id ? [recipient.user_id] : []));
    const activeUsers = new Set(
      userIds.length && input.business_id
        ? (
            await this.prisma.users.findMany({
              where: {
                id: { in: userIds },
                business_id: input.business_id,
                status: 'active',
              },
              select: { id: true },
            })
          ).map((user) => user.id)
        : [],
    );

    return channels.flatMap((channel) =>
      recipients.map((recipient) => {
        const skipReason = this.skipReason(channel, recipient, activeUsers, input.business_id);
        return {
          channel,
          recipient_user_id: recipient.user_id ?? null,
          recipient_email: recipient.email ?? null,
          recipient_name: recipient.name ?? null,
          status: (skipReason ? 'skipped' : 'queued') as notification_delivery_status,
          error: skipReason,
        };
      }),
    );
  }

  private skipReason(
    channel: notification_channel,
    recipient: NotificationRecipient,
    activeUsers: Set<string>,
    business_id: string | undefined,
  ): string | null {
    if (recipient.user_id && !activeUsers.has(recipient.user_id)) {
      return 'Recipient is not an active user of this business';
    }
    switch (channel) {
      case 'email':
        return recipient.email ? null : 'Recipient has no email address';
      case 'in_app':
        if (!business_id) return 'In-app notifications need a business_id';
        return recipient.user_id ? null : 'In-app notifications need a signed-in user (user_id)';
    }
  }

  private async enqueue(delivery: { id: string; channel: notification_channel; status: notification_delivery_status }) {
    if (delivery.status !== 'queued') return delivery;
    try {
      // jobId = delivery id, so queueing the same delivery twice never sends it twice.
      await this.queues[delivery.channel].add(
        delivery.channel,
        { delivery_id: delivery.id },
        {
          ...NOTIFICATION_JOB_OPTIONS,
          jobId: delivery.id,
        },
      );
      return delivery;
    } catch (error) {
      // The caller's action (e.g. creating an invite) has already happened; record the failure
      // rather than failing it.
      this.logger.error(`Couldn't queue ${delivery.channel} delivery ${delivery.id}`, error);
      const failed = await this.prisma.notification_deliveries.update({
        where: { id: delivery.id },
        data: { status: 'failed', error: `Couldn't queue: ${Helper.errorMessage(error)}` },
        select: { id: true, channel: true, status: true },
      });
      return failed;
    }
  }

  private async findByIdempotencyKey(idempotency_key: string): Promise<QueuedNotification | null> {
    const event = await this.prisma.notification_events.findUnique({
      where: { idempotency_key },
      select: {
        id: true,
        deliveries: {
          select: {
            id: true,
            channel: true,
            status: true,
          },
        },
      },
    });

    return event
      ? {
          event_id: event.id,
          duplicate: true,
          deliveries: event.deliveries,
        }
      : null;
  }
}

/**
 * The same person listed twice (by user id or email) is notified once. Recipients with neither
 * are kept so their delivery is recorded as skipped.
 */
function dedupeRecipients(recipients: NotificationRecipient[]): NotificationRecipient[] {
  const seen = new Set<string>();
  return recipients.filter((recipient) => {
    const key = recipient.user_id ?? recipient.email?.toLowerCase();
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
