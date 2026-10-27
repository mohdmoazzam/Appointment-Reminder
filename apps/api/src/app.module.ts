import { BullModule } from '@nestjs/bullmq';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AssetsModule } from './assets/assets.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BusinessModule } from './business/business.module.js';
import { CryptoModule } from './common/crypto/crypto.module.js';
import { MailModule } from './common/mail/mail.module.js';
import { PrismaModule } from './common/database/prisma.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { validateEnv, type AppConfigService } from './config/env.config.js';
import { redisConnection } from './config/redis.config.js';
import { HealthModule } from './health/health.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { BookingModule } from './booking/booking.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { ServicesModule } from './services/services.module.js';
import { StaffModule } from './staff/staff.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: redisConnection(config.get('REDIS_URL', { infer: true })),
        prefix: config.get('QUEUE_PREFIX', { infer: true }),
      }),
    }),
    PrismaModule,
    CryptoModule,
    StorageModule,
    MailModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    BusinessModule,
    StaffModule,
    UsersModule,
    AssetsModule,
    ServicesModule,
    SchedulesModule,
    CustomersModule,
    AppointmentsModule,
    BookingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registered here (not in main.ts) so e2e tests get the same validation.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    },
  ],
})
export class AppModule {}
