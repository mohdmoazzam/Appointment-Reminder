import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigService } from '../../config/env.config.js';
import { MAIL_TRANSPORT, type MailAddress, type MailMessage, type MailTransport, type SentMail } from './mail.types.js';

/**
 * Sends an email from the app's sender through the provider chosen by MAIL_PROVIDER
 * (see mail.module.ts). Features don't call this: they go through NotificationService, whose
 * email processor renders the template and calls this.
 */
@Injectable()
export class MailService {
  private readonly from: MailAddress;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @Inject(ConfigService) config: AppConfigService,
  ) {
    this.from = {
      email: config.get('MAIL_FROM_EMAIL', { infer: true }),
      name: config.get('MAIL_FROM_NAME', { infer: true }),
    };
  }

  /** Throws when the provider rejects it, so the caller can retry. */
  send(message: MailMessage): Promise<SentMail> {
    return this.transport.send(message, this.from);
  }
}
