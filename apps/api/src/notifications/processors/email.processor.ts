import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { NOTIFICATION_QUEUES } from '../../common/constants.js';
import { PrismaService } from '../../common/database/prisma.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { PermanentMailError } from '../../common/mail/mail.types.js';
import { EmailTemplatesService } from '../email-templates.service.js';
import { ChannelProcessor, type DeliveryToSend } from './channel.processor.js';

@Processor(NOTIFICATION_QUEUES.email, { concurrency: 5 })
export class EmailProcessor extends ChannelProcessor {
  protected readonly logger = new Logger(EmailProcessor.name);

  constructor(
    prisma: PrismaService,
    private readonly templates: EmailTemplatesService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async deliver({ event, recipient_email, recipient_name }: DeliveryToSend) {
    // queueNotification skips email deliveries without an address.
    if (!recipient_email) throw new UnrecoverableError('No email address');

    const email = await this.templates.render(event.event, event.business_id, event.payload);
    try {
      const sent = await this.mail.send({
        to: {
          email: recipient_email,
          name: recipient_name ?? undefined,
        },
        replyTo: event.reply_to_email ? { email: event.reply_to_email, name: event.reply_to_name ?? undefined } : undefined,
        ...email,
      });
      return {
        provider_message_id: sent.message_id,
      };
    } catch (error) {
      if (error instanceof PermanentMailError) throw new UnrecoverableError(error.message);
      throw error;
    }
  }
}
