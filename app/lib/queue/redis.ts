// =============================================================================
// VANTA OS — Redis singleton (Section 7, Section 68)
// Single ioredis connection reused by BullMQ queue, worker, and rate limiter.
// Worker uses a separate connection (BullMQ requirement) — see queue.ts.
// =============================================================================

import Redis, { type RedisOptions } from "ioredis";
import { loadEnv } from "~/lib/env.server";
import { logger } from "~/lib/logger.server";

let connection: Redis | null = null;
let workerConnection: Redis | null = null;

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null, // BullMQ requires null
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
  connectTimeout: 5_000,
  commandTimeout: 10_000,
  retryStrategy: (times) => {
    if (times > 20) {
      logger.error("Redis exhausted retries — giving up", { attempts: times });
      return null;
    }
    return Math.min(times * 200, 5_000);
  },
};

/** Connection used by the web process (enqueuing, rate limiter, cache). */
export function getRedis(): Redis {
  if (connection) return connection;
  connection = new Redis(loadEnv().REDIS_URL, baseOptions);
  connection.on("error", (err) => {
    logger.error("Redis connection error", { error: String(err) });
  });
  connection.on("connect", () => logger.info("Redis connected"));
  return connection;
}

/**
 * Separate connection used by the BullMQ worker.
 * BullMQ requires a dedicated connection for the worker to avoid blocking
 * the enqueue connection.
 */
export function getWorkerRedis(): Redis {
  if (workerConnection) return workerConnection;
  workerConnection = new Redis(loadEnv().REDIS_URL, {
    ...baseOptions,
    maxRetriesPerRequest: null,
  });
  workerConnection.on("error", (err) => {
    logger.error("Worker Redis connection error", { error: String(err) });
  });
  return workerConnection;
}

/** Cache helper — write-through strategy (Section 38). */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSec: number = 300,
): Promise<void> {
  const r = getRedis();
  try {
    await r.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSec);
  } catch (err) {
    logger.warn("cacheSet failed", { key, error: String(err) });
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  try {
    const raw = await r.get(`cache:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  const r = getRedis();
  try {
    await r.del(`cache:${key}`);
  } catch {
    // ignore
  }
}

/** Cache key helper scoped per shop (Section 44). */
export function shopCacheKey(shopDomain: string, ...parts: string[]): string {
  return `${shopDomain}:${parts.join(":")}`;
}

/** Disconnect both connections — used by tests + graceful worker shutdown. */
export async function disconnectRedis(): Promise<void> {
  const promises: Promise<unknown>[] = [];
  if (connection) promises.push(connection.quit().catch(() => {}));
  if (workerConnection) promises.push(workerConnection.quit().catch(() => {}));
  await Promise.all(promises);
  connection = null;
  workerConnection = null;
}
