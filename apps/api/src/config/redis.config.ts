import type { RedisOptions } from 'ioredis';

/**
 * "redis://user:pass@host:6380/0" (or rediss:// for TLS, e.g. managed Redis) -> ioredis options,
 * for BullMQ and the notification stream's pub/sub.
 */
export function redisConnection(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ workers: they block on Redis and must not give up on a slow reply.
    maxRetriesPerRequest: null,
  };
}
