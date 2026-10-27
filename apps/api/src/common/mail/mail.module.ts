import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigService } from '../../config/env.config.js';
import { MAIL_TRANSPORT, type MailTransport } from './mail.types.js';
import { MailService } from './mail.service.js';
import { BrevoTransport } from './transports/brevo.transport.js';
import { LogTransport } from './transports/log.transport.js';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: AppConfigService): MailTransport => {
        const provider = config.get('MAIL_PROVIDER', { infer: true });
        switch (provider) {
          case 'brevo':
            return new BrevoTransport(config.get('BREVO_API_KEY', { infer: true }));
          case 'log':
            return new LogTransport();
        }
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
