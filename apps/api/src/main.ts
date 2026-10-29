import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { AppConfigService } from './config/env.config.js';
import { setupSwagger } from './config/swagger.config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfigService>(ConfigService);
  // Behind a reverse proxy on a private network: take the client IP (rate limits, sessions)
  // from X-Forwarded-For, but only when the hop itself is a private address.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();
  setupSwagger(app);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
