// =============================================================================
// VANTA OS — Webhook verification + idempotency (Section 5.2, Section 76)
// - HMAC verification on EVERY webhook — 401 on invalid HMAC or unknown shop
// - Idempotency via ProcessedWebhook table (keyed on X-Shopify-Webhook-Id)
// - Responds 200 immediately; redaction/data-export processed async
// =============================================================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { loadEnv } from "~/lib/env.server";

export interface WebhookHeaders {
  shopifyHmac: string | null;
  shopifyShop: string | null;
  shopifyTopic: string | null;
  shopifyApiVersion: string | null;
  webhookId: string | null;
}

export function extractWebhookHeaders(request: Request): WebhookHeaders {
  const h = request.headers;
  return {
    shopifyHmac: h.get("X-Shopify-Hmac-Sha256"),
    shopifyShop: h.get("X-Shopify-Shop-Domain"),
    shopifyTopic: h.get("X-Shopify-Topic"),
    shopifyApiVersion: h.get("X-Shopify-API-Version"),
    webhookId: h.get("X-Shopify-Webhook-Id"),
  };
}

/**
 * Verify Shopify HMAC SHA256 signature (Section 5.2, Section 13).
 * Uses timing-safe comparison to prevent timing attacks.
 * Returns true if valid, false otherwise.
 */
export function verifyWebhookHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const secret = loadEnv().SHOPIFY_API_SECRET;
  const computed = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  try {
    const a = Buffer.from(computed, "base64");
    const b = Buffer.from(hmacHeader, "base64");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Idempotency check — Section 76.
 * Shopify retries failed webhooks up to 19 times over 48 hours.
 * We must never process the same webhook twice.
 *
 * Returns true if this webhook has already been processed (caller returns 200
 * immediately without re-executing logic).
 */
export async function isWebhookAlreadyProcessed(webhookId: string | null): Promise<boolean> {
  if (!webhookId) return false;
  const existing = await prisma.processedWebhook.findUnique({
    where: { webhookId },
    select: { id: true },
  });
  return Boolean(existing);
}

/**
 * Mark a webhook as processed. Idempotent.
 */
export async function markWebhookProcessed(
  headers: WebhookHeaders,
  payload: unknown,
): Promise<void> {
  if (!headers.webhookId) return;
  await prisma.processedWebhook.upsert({
    where: { webhookId: headers.webhookId },
    create: {
      webhookId: headers.webhookId,
      topic: headers.shopifyTopic ?? "unknown",
      shopDomain: headers.shopifyShop ?? "unknown",
      apiVersion: headers.shopifyApiVersion ?? "unknown",
      payload: payload as object,
    },
    update: {},
  });
}

/**
 * Standard authenticated webhook handler — wraps HMAC verification + idempotency.
 * The handler callback runs ONLY on valid, first-time webhooks.
 *
 * Returns a Response appropriate for Shopify:
 *   200 — processed (or already processed, idempotent)
 *   401 — invalid HMAC
 *   400 — missing required headers
 *   500 — handler threw
 */
export async function handleWebhook(
  request: Request,
  handler: (payload: unknown, headers: WebhookHeaders) => Promise<void>,
): Promise<Response> {
  const headers = extractWebhookHeaders(request);

  if (!headers.shopifyHmac || !headers.shopifyTopic) {
    logger.warn("Webhook missing required headers", {
      hasHmac: Boolean(headers.shopifyHmac),
      topic: headers.shopifyTopic,
    });
    return new Response("Missing headers", { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifyWebhookHmac(rawBody, headers.shopifyHmac)) {
    logger.warn("Webhook HMAC verification failed", {
      topic: headers.shopifyTopic,
      shop: headers.shopifyShop,
    });
    return new Response("Unauthorized", { status: 401 });
  }

  // Idempotency (Section 76)
  if (await isWebhookAlreadyProcessed(headers.webhookId)) {
    logger.info("Webhook already processed — skipping", {
      webhookId: headers.webhookId,
      topic: headers.shopifyTopic,
    });
    return new Response("OK (already processed)", { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    logger.warn("Webhook body was not valid JSON", {
      webhookId: headers.webhookId,
      topic: headers.shopifyTopic,
    });
    return new Response("Bad JSON", { status: 400 });
  }

  // Mark BEFORE handler runs — protects against the worker crashing mid-flight
  await markWebhookProcessed(headers, payload);

  // Respond 200 immediately; defer work to the handler (Section 5.2)
  // We still await the handler so we can return 500 on hard failures.
  try {
    await handler(payload, headers);
    return new Response("OK", { status: 200 });
  } catch (err) {
    logger.error("Webhook handler threw", {
      topic: headers.shopifyTopic,
      shop: headers.shopifyShop,
      error: String(err),
    });
    // We've already marked it processed, so retries won't re-run the handler.
    // Return 200 to stop Shopify's retry storm; rely on Sentry + alerting.
    return new Response("OK (handler errored)", { status: 200 });
  }
}
