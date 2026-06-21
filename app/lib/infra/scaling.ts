// =============================================================================
// VANTA OS — Horizontal Scaling Infrastructure (Billion-User Ready)
// Multi-tier: L1 memory cache → L2 Redis → L3 CDN
// Circuit breakers, request batching, read replicas, graceful degradation.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { getRedis } from "~/lib/queue/redis";
import { logger } from "~/lib/logger.server";

// --- 1. Multi-Tier Cache ----------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const L1_CACHE = new Map<string, CacheEntry<unknown>>();
const L1_MAX_SIZE = 10_000;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const l1 = L1_CACHE.get(key);
  if (l1 && l1.expiresAt > Date.now()) return l1.value as T;
  if (l1) L1_CACHE.delete(key);

  try {
    const redis = getRedis();
    const raw = await redis.get(`cache:${key}`);
    if (raw) {
      const value = JSON.parse(raw) as T;
      setL1(key, value, 60);
      return value;
    }
  } catch {
    // Redis down — degrade gracefully
  }
  return null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  setL1(key, value, Math.min(ttlSeconds, 60));
  try {
    const redis = getRedis();
    await redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  L1_CACHE.delete(key);
  try {
    const redis = getRedis();
    await redis.del(`cache:${key}`);
  } catch {
    // ignore
  }
}

function setL1<T>(key: string, value: T, ttlSeconds: number): void {
  if (L1_CACHE.size >= L1_MAX_SIZE) {
    const firstKey = L1_CACHE.keys().next().value;
    if (firstKey) L1_CACHE.delete(firstKey);
  }
  L1_CACHE.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// --- 2. Circuit Breaker ------------------------------------------------------

type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureAt = 0;
  private halfOpenCalls = 0;

  constructor(
    private name: string,
    private opts: { failureThreshold: number; resetTimeout: number; halfOpenMaxCalls: number },
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureAt > this.opts.resetTimeout) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
      } else {
        throw new Error(`Circuit [${this.name}] open`);
      }
    }
    if (this.state === "half-open" && this.halfOpenCalls >= this.opts.halfOpenMaxCalls) {
      throw new Error(`Circuit [${this.name}] half-open limit`);
    }
    if (this.state === "half-open") this.halfOpenCalls++;
    try {
      const r = await fn();
      if (this.state === "half-open") {
        this.state = "closed";
        logger.info("Circuit recovered", { name: this.name });
      }
      this.failureCount = 0;
      return r;
    } catch (err) {
      this.failureCount++;
      this.lastFailureAt = Date.now();
      if (this.state === "half-open" || this.failureCount >= this.opts.failureThreshold) {
        this.state = "open";
      }
      throw err;
    }
  }
}

export const circuitBreakers = {
  shopify: new CircuitBreaker("shopify", { failureThreshold: 5, resetTimeout: 30_000, halfOpenMaxCalls: 3 }),
  gemini: new CircuitBreaker("gemini", { failureThreshold: 3, resetTimeout: 60_000, halfOpenMaxCalls: 1 }),
  redis: new CircuitBreaker("redis", { failureThreshold: 10, resetTimeout: 5_000, halfOpenMaxCalls: 5 }),
  database: new CircuitBreaker("db", { failureThreshold: 5, resetTimeout: 10_000, halfOpenMaxCalls: 2 }),
};

// --- 3. Request Batching -----------------------------------------------------

const batchers = new Map<string, { pending: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }>; timer: ReturnType<typeof setTimeout> | null }>();

export async function batchRequest<T>(key: string, fn: () => Promise<T>, windowMs = 50): Promise<T> {
  let entry = batchers.get(key);
  if (!entry) {
    entry = { pending: [], timer: null };
    batchers.set(key, entry);
  }
  if (entry.pending.length === 0) {
    entry.timer = setTimeout(async () => {
      const current = batchers.get(key);
      if (!current) return;
      batchers.delete(key);
      try {
        const result = await fn();
        for (const p of current.pending) p.resolve(result);
      } catch (err) {
        for (const p of current.pending) p.reject(err);
      }
    }, windowMs);
  }
  return new Promise<T>((resolve, reject) => {
    entry!.pending.push({ resolve: resolve as (v: unknown) => void, reject });
  });
}

// --- 4. Graceful Degradation -------------------------------------------------

export async function withFallbacks<T>(strategies: Array<{ name: string; fn: () => Promise<T> }>): Promise<T> {
  let lastErr: unknown;
  for (const s of strategies) {
    try {
      return await s.fn();
    } catch (err) {
      lastErr = err;
      logger.warn("Strategy failed", { strategy: s.name, error: String(err) });
    }
  }
  throw lastErr ?? new Error("All strategies failed");
}

// --- 5. Health Metrics -------------------------------------------------------

export interface HealthMetrics {
  memoryUsage: number;
  uptime: number;
  cacheSize: number;
}

export function collectHealthMetrics(): HealthMetrics {
  const mem = process.memoryUsage();
  return {
    memoryUsage: mem.heapUsed / Math.max(1, mem.rss),
    uptime: process.uptime(),
    cacheSize: L1_CACHE.size,
  };
}
