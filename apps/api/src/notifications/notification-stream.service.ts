import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { filter, map, Subject, type Observable } from 'rxjs';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import type { NotificationStreamEvent } from '../common/dtos/notifications.dto.js';
import { Helper } from '../common/helper.js';
import type { AppConfigService } from '../config/env.config.js';
import { redisConnection } from '../config/redis.config.js';

/** One message on the Redis channel: an event for one user's open streams. */
interface StreamMessage {
  user_id: string;
  business_id: string;
  event: NotificationStreamEvent;
}

/**
 * Live updates for in-app notifications. Events go through Redis pub/sub, so a notification
 * created by a worker on one instance reaches streams held open by any other.
 *
 * Best effort: a user who isn't connected (or misses an event while reconnecting) still sees
 * everything in GET /notifications, which the web app refetches when its stream reconnects.
 */
@Injectable()
export class NotificationStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationStreamService.name);
  private readonly channel: string;
  private readonly publisher: Redis;
  /** A subscribed Redis connection can't run other commands, hence two. */
  private readonly subscriber: Redis;
  private readonly messages = new Subject<StreamMessage>();

  constructor(@Inject(ConfigService) config: AppConfigService) {
    const connection = redisConnection(config.get('REDIS_URL', { infer: true }));
    this.channel = `${config.get('QUEUE_PREFIX', { infer: true })}:in-app-notifications`;
    // Give up on a publish after a few retries rather than holding up the caller while Redis is down.
    this.publisher = new Redis({ ...connection, maxRetriesPerRequest: 3, lazyConnect: true });
    this.subscriber = new Redis({ ...connection, lazyConnect: true });
    for (const client of [this.publisher, this.subscriber]) {
      client.on('error', (error) => this.logger.warn(`Redis: ${Helper.errorMessage(error)}`));
    }
  }

  async onModuleInit(): Promise<void> {
    this.subscriber.on('message', (_channel, raw: string) => {
      try {
        this.messages.next(JSON.parse(raw) as StreamMessage);
      } catch (error) {
        this.logger.warn(`Ignoring malformed stream message: ${Helper.errorMessage(error)}`);
      }
    });
    // ioredis subscribes again by itself after a reconnect.
    await this.subscriber.subscribe(this.channel);
  }

  async onModuleDestroy(): Promise<void> {
    this.messages.complete();
    await Promise.allSettled([this.subscriber.quit(), this.publisher.quit()]);
  }

  /** The events for the signed-in user, from now on. */
  eventsFor(auth: AuthUser): Observable<NotificationStreamEvent> {
    return this.messages.pipe(
      filter((message) => message.user_id === auth.user_id && message.business_id === auth.business_id),
      map((message) => message.event),
    );
  }

  /** Never throws: the change it announces is already saved, and a missed push only delays it. */
  async publish(user_id: string, business_id: string, event: NotificationStreamEvent): Promise<void> {
    const message: StreamMessage = { user_id, business_id, event };
    try {
      await this.publisher.publish(this.channel, JSON.stringify(message));
    } catch (error) {
      this.logger.warn(`Couldn't publish ${event.type} for user ${user_id}: ${Helper.errorMessage(error)}`);
    }
  }
}
