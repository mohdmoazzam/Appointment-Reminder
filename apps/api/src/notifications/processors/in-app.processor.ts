import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { InAppNotificationMessageResolver, NOTIFICATION_QUEUES } from '../../common/constants.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { inAppNotificationSelect } from '../../common/database/selects.js';
import type { NotificationEventPayloadMap } from '../../common/dtos/notifications.dto.js';
import { NotificationStreamService } from '../notification-stream.service.js';
import { ChannelProcessor, type DeliveryToSend } from './channel.processor.js';

type Resolver = (payload: unknown) => { title: string; body: string; link?: string };

@Processor(NOTIFICATION_QUEUES.in_app, { concurrency: 10 })
export class InAppProcessor extends ChannelProcessor {
  protected readonly logger = new Logger(InAppProcessor.name);

  constructor(
    prisma: PrismaService,
    private readonly stream: NotificationStreamService,
  ) {
    super(prisma);
  }

  protected async deliver({ id, event, recipient_user_id }: DeliveryToSend) {
    // queueNotification skips in-app deliveries without a user or business.
    if (!recipient_user_id || !event.business_id) {
      throw new UnrecoverableError('No user or business');
    }

    const resolve = InAppNotificationMessageResolver[event.event as keyof NotificationEventPayloadMap] as Resolver | undefined;
    if (!resolve) {
      throw new UnrecoverableError(`No in-app message for "${event.event}" in InAppNotificationMessageResolver`);
    }
    const message = resolve(event.payload);

    // Keyed by the delivery, so a retry after a half-finished attempt doesn't show it twice.
    const notification = await this.prisma.in_app_notifications.upsert({
      where: { delivery_id: id },
      create: {
        delivery_id: id,
        business_id: event.business_id,
        user_id: recipient_user_id,
        event: event.event,
        title: message.title,
        body: message.body,
        link: message.link ?? null,
      },
      update: {},
      select: inAppNotificationSelect,
    });
    // On a retry this can announce it a second time; the web app keys notifications by id.
    await this.stream.publish(recipient_user_id, event.business_id, { type: 'notification.created', notification });
    return {};
  }
}
