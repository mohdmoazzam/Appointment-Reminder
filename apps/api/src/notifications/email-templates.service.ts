import { Injectable } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { PrismaService } from '../common/database/prisma.service.js';
import { escapeHtml, layout } from '../common/mail/templates/layout.js';

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Picks an event's email template from email_templates and fills it in from the payload. */
@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async render(type: string, business_id: string | null, payload: Record<string, string | number>): Promise<RenderedEmail> {
    const template = await this.prisma.email_templates.findFirst({
      where: {
        type: type,
        is_default: true,
        OR: [{ business_id: null }, ...(business_id ? [{ business_id }] : [])],
      },
      // The business's own template wins over the app-wide one.
      orderBy: [{ business_id: { sort: 'asc', nulls: 'last' } }, { updated_at: 'desc' }],
      select: { subject: true, html: true, text: true },
    });
    if (!template) throw new UnrecoverableError(`No default email template for "${type}"`);

    const fill = (source: string, escape: (value: string) => string) =>
      source.replace(PLACEHOLDER, (_match, key: string) => {
        const value = payload[key];
        // A typo in a template shouldn't send "Hi {{frist_name}}" to a customer.
        if (value === undefined) throw new UnrecoverableError(`Template "${type}" uses {{${key}}}, which the payload doesn't have`);
        return escape(String(value));
      });

    const subject = fill(template.subject, (value) => value);
    return {
      subject,
      html: layout({ preheader: subject, body: fill(template.html, escapeHtml) }),
      text: fill(template.text, (value) => value),
    };
  }
}
