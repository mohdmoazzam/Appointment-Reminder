import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UnrecoverableError, type Job } from 'bullmq';
import { performance } from 'node:perf_hooks';
import type { PrismaService } from '../../common/database/prisma.service.js';
import type { NotificationJobData } from '../../common/dtos/notifications.dto.js';
import { Helper } from '../../common/helper.js';

const deliverySelect = {
  id: true,
  channel: true,
  status: true,
  recipient_user_id: true,
  recipient_email: true,
  recipient_name: true,
  event: {
    select: {
      id: true,
      business_id: true,
      event: true,
      payload: true,
      reply_to_email: true,
      reply_to_name: true,
    },
  },
} as const;

export interface DeliveryToSend {
  id: string;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  event: {
    id: string;
    business_id: string | null;
    event: string;
    payload: Record<string, string | number>;
    reply_to_email: string | null;
    reply_to_name: string | null;
  };
}

/**
 * Shared by every channel's processor: loads the delivery, logs each attempt and keeps the
 * delivery's status up to date. A channel only implements `deliver`.
 *
 * Throwing from `deliver` retries it (NOTIFICATION_JOB_OPTIONS); throwing UnrecoverableError
 * fails it at once, for problems a retry won't fix (missing template, rejected address).
 */
export abstract class ChannelProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  constructor(protected readonly prisma: PrismaService) {
    super();
  }

  /** Sends it; returns the provider's message id when there is one. */
  protected abstract deliver(delivery: DeliveryToSend): Promise<{ provider_message_id?: string | null }>;

  async process(job: Job<NotificationJobData>): Promise<void> {
    const delivery = await this.prisma.notification_deliveries.findUnique({
      where: { id: job.data.delivery_id },
      select: deliverySelect,
    });
    // Gone (its business was deleted) or already handled (e.g. the job was queued twice).
    if (!delivery || delivery.status !== 'queued') return;

    const attempt = job.attemptsMade + 1;
    const started = performance.now();
    try {
      const result = await this.deliver(delivery as DeliveryToSend);
      await this.record(delivery.id, attempt, started, null, {
        status: 'sent',
        sent_at: Helper.getCurrentTimestamp(),
        provider_message_id: result.provider_message_id ?? null,
        error: null,
      });
    } catch (error) {
      const finalAttempt = error instanceof UnrecoverableError || attempt >= (job.opts.attempts ?? 1);
      this.logger.warn(
        `${delivery.channel} delivery ${delivery.id} attempt ${attempt} failed${finalAttempt ? ' for good' : ''}: ${Helper.errorMessage(error)}`,
      );
      await this.record(delivery.id, attempt, started, Helper.errorMessage(error), {
        status: finalAttempt ? 'failed' : 'queued',
        error: Helper.errorMessage(error),
      });
      throw error;
    }
  }

  private async record(
    delivery_id: string,
    attempt: number,
    started: number,
    error: string | null,
    update: { status: 'sent' | 'queued' | 'failed'; error: string | null; sent_at?: Date; provider_message_id?: string | null },
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.notification_delivery_attempts.create({
        data: {
          delivery_id,
          attempt,
          succeeded: error === null,
          error,
          duration_ms: Math.round(performance.now() - started),
        },
      }),
      this.prisma.notification_deliveries.update({
        where: { id: delivery_id },
        data: { ...update, attempts: attempt },
      }),
    ]);
  }
}
