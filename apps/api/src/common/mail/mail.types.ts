export interface MailAddress {
  email: string;
  name?: string;
}

export interface MailMessage {
  to: MailAddress;
  subject: string;
  html: string;
  /** Plain-text version for clients that don't show HTML (and spam filters like having one). */
  text: string;
  replyTo?: MailAddress;
}

export interface SentMail {
  /** The provider's id for the message, to trace it on their side. */
  message_id: string | null;
}

/**
 * One email provider. MailService picks one from MAIL_PROVIDER; to add a provider (e.g. AWS SES),
 * implement this, add it to MAIL_PROVIDERS in env.config.ts and to the switch in mail.module.ts.
 */
export interface MailTransport {
  send(message: MailMessage, from: MailAddress): Promise<SentMail>;
}

/** Injection token for the active MailTransport. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/** The provider rejected the message in a way retrying won't fix (bad address, bad API key...). */
export class PermanentMailError extends Error {}
