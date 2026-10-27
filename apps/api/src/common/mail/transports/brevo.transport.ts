import { PermanentMailError, type MailAddress, type MailMessage, type MailTransport, type SentMail } from '../mail.types.js';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

/** Sends through Brevo's transactional email API (https://developers.brevo.com/reference/sendtransacemail). */
export class BrevoTransport implements MailTransport {
  constructor(private readonly apiKey: string) {}

  async send(message: MailMessage, from: MailAddress): Promise<SentMail> {
    const res = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: { 'api-key': this.apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: from,
        to: [message.to],
        replyTo: message.replyTo,
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const reason = `Brevo responded ${res.status}: ${await res.text()}`;
      // 4xx (other than rate limiting) means the request itself is wrong; 5xx and 429 may pass later.
      const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
      throw permanent ? new PermanentMailError(reason) : new Error(reason);
    }
    const body = (await res.json()) as { messageId?: string };
    return { message_id: body.messageId ?? null };
  }
}
