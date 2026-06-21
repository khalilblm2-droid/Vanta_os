// =============================================================================
// VANTA OS — Per-shop rate limiter (Section 13)
// Rate-limit the task-creation endpoint per shop to prevent runaway credit
// burn from a bug or abuse.
//
// Uses a sliding-window counter in Redis. Falls back to an in-memory map when
// Redis is unavailable (dev only — production must use Redis).
// =============================================================================

import Redis from "ioredis";
import { loadEnv } from "~/lib/env.server";
import { logger } from "~/lib/logger.server";

let redis: Redis | null = null;
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(loadEnv().REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
      connectTimeout: 1_000,
    });
    redis.on("error", (err) => {
      logger.warn("Redis error in rate limiter", { error: String(err) });
      redis = null;
    });
    return redis;
  } catch {
    return null;
  }
}

export interface RateLimitOptions {
  /** Unique key (e.g. `task-create:${shopDomain}`). */
  key: string;
  /** Max requests allowed in the window. */
  limit: number;
  /** Window size in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Sliding-window rate limiter. Returns whether the request is allowed.
 * Mutates the counter (decrements remaining) on each call.
 */
export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const r = getRedis();
  if (r) {
    return redisRateLimit(r, opts);
  }
  return memoryRateLimit(opts);
}

async function redisRateLimit(r: Redis, opts: RateLimitOptions): Promise<RateLimitResult> {
  const key = `ratelimit:${opts.key}`;
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;

  const pipe = r.pipeline();
  pipe.zremrangebyscore(key, 0, now - windowMs);
  pipe.zadd(key, now, `${now}-${Math.random()}`);
  pipe.zcard(key);
  pipe.pexpire(key, windowMs);
  const results = await pipe.exec();
  if (!results) throw new Error("Redis pipeline returned no results");

  const count = (results[2][1] as number) ?? 0;
  if (count > opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(opts.windowSec),
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, opts.limit - count),
    retryAfterSec: 0,
  };
}

function memoryRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const entry = memoryStore.get(opts.key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(opts.key, { count: 1, resetAt: now + windowMs });
    return Promise.resolve({ allowed: true, remaining: opts.limit - 1, retryAfterSec: 0 });
  }
  if (entry.count >= opts.limit) {
    return Promise.resolve({
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    });
  }
  entry.count++;
  return Promise.resolve({
    allowed: true,
    remaining: opts.limit - entry.count,
    retryAfterSec: 0,
  });
}

/** Pre-configured limiter for task creation (Section 13). */
export async function rateLimitTaskCreation(shopDomain: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `task-create:${shopDomain}`,
    limit: 30, // 30 tasks / minute per shop
    windowSec: 60,
  });
}

/** Limiter for command-history up-arrow fetches (Section 50). */
export async function rateLimitCommandHistory(shopDomain: string): Promise<RateLimitResult> {
  return rateLimit({
    key: `cmd-history:${shopDomain}`,
    limit: 60,
    windowSec: 60,
  });
}
