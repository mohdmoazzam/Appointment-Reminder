import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { PrismaService } from '../common/database/prisma.service.js';
import type { Prisma } from '../common/database/prisma/generated/client.js';
import { inAppNotificationSelect } from '../common/database/selects.js';
import { PageDto, PageMetaDto } from '../common/dtos/common.dto.js';
import type { ListNotificationsDto } from '../common/dtos/notifications.dto.js';
import { Helper } from '../common/helper.js';
import { NotificationStreamService } from './notification-stream.service.js';

/** The signed-in user's own in-app notifications. */
@Injectable()
export class InAppNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stream: NotificationStreamService,
  ) {}

  async list(auth: AuthUser, query: ListNotificationsDto) {
    const where = {
      user_id: auth.user_id,
      business_id: auth.business_id,
      ...(query.unread_only && { read_at: null }),
    } satisfies Prisma.in_app_notificationsWhereInput;
    const [total, data] = await this.prisma.$transaction([
      this.prisma.in_app_notifications.count({ where }),
      this.prisma.in_app_notifications.findMany({
        where,
        select: inAppNotificationSelect,
        orderBy: { created_at: query.order },
        skip: query.skip,
        take: query.take,
      }),
    ]);
    return new PageDto(data, new PageMetaDto({ count: total, pageOptionsDto: query }));
  }

  async unreadCount(auth: AuthUser) {
    const count = await this.prisma.in_app_notifications.count({
      where: { user_id: auth.user_id, business_id: auth.business_id, read_at: null },
    });
    return { count };
  }

  async markRead(auth: AuthUser, id: string) {
    const notification = await this.prisma.in_app_notifications.findFirst({
      where: { id, user_id: auth.user_id, business_id: auth.business_id },
      select: { id: true, read_at: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.read_at) return this.get(id);

    const updated = await this.prisma.in_app_notifications.update({
      where: { id },
      data: { read_at: Helper.getCurrentTimestamp() },
      select: inAppNotificationSelect,
    });
    // The user's other tabs and devices update their unread count.
    await this.stream.publish(auth.user_id, auth.business_id, { type: 'notification.read', ids: [id] });
    return updated;
  }

  async markAllRead(auth: AuthUser): Promise<void> {
    const { count } = await this.prisma.in_app_notifications.updateMany({
      where: { user_id: auth.user_id, business_id: auth.business_id, read_at: null },
      data: { read_at: Helper.getCurrentTimestamp() },
    });
    if (count > 0) {
      await this.stream.publish(auth.user_id, auth.business_id, { type: 'notification.read', ids: 'all' });
    }
  }

  private get(id: string) {
    return this.prisma.in_app_notifications.findUniqueOrThrow({ where: { id }, select: inAppNotificationSelect });
  }
}
