import { Logger } from '@nestjs/common';
import type { MailAddress, MailMessage, MailTransport, SentMail } from '../mail.types.js';

/** Doesn't send anything: logs the email instead. For local development and tests. */
export class LogTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage, from: MailAddress): Promise<SentMail> {
    this.logger.log(`From ${from.email} to ${message.to.email}: ${message.subject}\n${message.text}`);
    return Promise.resolve({ message_id: null });
  }
}
