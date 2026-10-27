import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { NOTIFICATION_QUEUES } from '../common/constants.js';
import { NotificationService } from '../common/services/notification.service.js';
import { EmailTemplatesService } from './email-templates.service.js';
import { InAppNotificationsService } from './in-app-notifications.service.js';
import { NotificationStreamService } from './notification-stream.service.js';
import { NotificationsController } from './notifications.controller.js';
import { EmailProcessor } from './processors/email.processor.js';
import { InAppProcessor } from './processors/in-app.processor.js';

/** Global: any feature can inject NotificationService to notify people. */
@Global()
@Module({
  imports: [BullModule.registerQueue(...Object.values(NOTIFICATION_QUEUES).map((name) => ({ name })))],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    NotificationStreamService,
    EmailTemplatesService,
    InAppNotificationsService,
    EmailProcessor,
    InAppProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
