// =============================================================================
// VANTA OS — /health endpoint (Section 40)
// Returns 200 OK when the app is alive. Used by monitoring + docker healthcheck.
// Also surfaces a degraded state if DB or Redis is unreachable.
// =============================================================================

import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/lib/db.server";
import { loadEnv } from "~/lib/env.server";
import { APP_IDENTITY, SHOPIFY_API_VERSION } from "~/lib/shopify/constants";
import { logger } from "~/lib/logger.server";

export const loader = async (_: LoaderFunctionArgs) => {
  const started = Date.now();
  const status: Record<string, unknown> = {
    app: APP_IDENTITY.NAME,
    version: APP_IDENTITY.VERSION,
    env: loadEnv().APP_ENV,
    api_version: SHOPIFY_API_VERSION,
    timestamp: new Date().toISOString(),
    uptime_sec: Math.round(process.uptime()),
  };

  // DB probe
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.db = "ok";
  } catch (err) {
    status.db = "error";
    status.db_error = String(err);
    logger.error("Health check DB probe failed", { error: String(err) });
    return Response.json({ ...status, status: "degraded" }, { status: 503 });
  }

  // Redis probe (optional — degrade gracefully)
  try {
    const { default: Redis } = await import("ioredis");
    const r = new Redis(loadEnv().REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 800 });
    await r.ping();
    r.disconnect();
    status.redis = "ok";
  } catch (err) {
    status.redis = "error";
    status.redis_error = String(err);
  }

  status.response_ms = Date.now() - started;
  return Response.json({ ...status, status: "ok" }, { status: 200 });
};
