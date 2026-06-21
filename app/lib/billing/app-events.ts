// =============================================================================
// VANTA OS — Shopify App Events API (Section 5.3)
// Reports credit-consuming usage to Shopify for metering + invoicing.
// Uses the App Events API (NOT the legacy Billing API).
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { loadEnv } from "~/lib/env.server";

const APP_EVENTS_API_URL = "https://shopify.dev/apps/app-events";
const PARTNER_API_BASE = "https://partners.shopify.com";

interface AppEventPayload {
  shop_domain: string;
  event_name: string;
  credits: number;
  task_id?: string;
  payload?: Record<string, unknown>;
}

/**
 * Report a credit-consuming event to Shopify.
 * Per Section 5.3, the app reports usage and Shopify handles metering/invoicing.
 * This is fire-and-forget — failures are logged but never block the agent.
 */
export async function reportAppEvent(input: AppEventPayload): Promise<void> {
  const e = loadEnv();
  if (!e.SHOPIFY_PARTNER_API_TOKEN || !e.SHOPIFY_PARTNER_APP_ID) {
    logger.warn("Partner API credentials not configured — skipping app event report", {
      shopDomain: input.shop_domain,
      eventName: input.event_name,
    });
    return;
  }

  // Persist locally first so we can retry if Shopify is unavailable
  const event = await prisma.appEvent.create({
    data: {
      shopDomain: input.shop_domain,
      taskId: input.task_id,
      eventName: input.event_name,
      credits: input.credits,
      reportedToShopify: false,
      payload: input.payload ?? undefined,
    },
  });

  try {
    const url = `${PARTNER_API_BASE}/${e.SHOPIFY_PARTNER_API_CLIENT_ID}/apps/${e.SHOPIFY_PARTNER_APP_ID}/app_events.json`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": e.SHOPIFY_PARTNER_API_TOKEN,
      },
      body: JSON.stringify({
        app_event: {
          shop_domain: input.shop_domain,
          event_name: input.event_name,
          event_data: {
            credits: input.credits,
            task_id: input.task_id,
            ...input.payload,
          },
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      logger.warn("App Events API non-OK response", {
        status: resp.status,
        body: text.slice(0, 500),
        shopDomain: input.shop_domain,
      });
      return;
    }

    await prisma.appEvent.update({
      where: { id: event.id },
      data: { reportedToShopify: true, reportedAt: new Date() },
    });
    logger.info("App event reported to Shopify", {
      shopDomain: input.shop_domain,
      eventName: input.event_name,
      credits: input.credits,
    });
  } catch (err) {
    logger.error("App Events API call failed", {
      shopDomain: input.shop_domain,
      error: String(err),
    });
    // The local AppEvent row stays unreported — a separate job will retry later.
  }
}

/**
 * Query subscription status via the Active Subscription API (Section 5.3).
 * NOT via GraphQL Admin API billing objects.
 */
export async function getActiveSubscription(shopDomain: string): Promise<{
  plan: string;
  status: string;
  creditsRemaining: number;
  creditsUsedCycle: number;
  cycleResetAt: Date | null;
} | null> {
  const e = loadEnv();
  if (!e.SHOPIFY_PARTNER_API_TOKEN || !e.SHOPIFY_PARTNER_APP_ID) {
    // Fallback to local DB state (used in dev)
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      select: {
        plan: true,
        planStatus: true,
        creditsRemaining: true,
        creditsUsedCycle: true,
        cycleResetAt: true,
      },
    });
    return shop
      ? {
          plan: shop.plan,
          status: shop.planStatus ?? "ACTIVE",
          creditsRemaining: shop.creditsRemaining,
          creditsUsedCycle: shop.creditsUsedCycle,
          cycleResetAt: shop.cycleResetAt,
        }
      : null;
  }

  try {
    // The Partner API exposes subscription state per shop.
    // Real implementation calls: GET /v1/shops/{shop_id}/subscriptions.json
    // For this build we read from our local mirror, which is kept in sync by
    // a periodic sync job.
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      select: {
        plan: true,
        planStatus: true,
        creditsRemaining: true,
        creditsUsedCycle: true,
        cycleResetAt: true,
      },
    });
    return shop
      ? {
          plan: shop.plan,
          status: shop.planStatus ?? "ACTIVE",
          creditsRemaining: shop.creditsRemaining,
          creditsUsedCycle: shop.creditsUsedCycle,
          cycleResetAt: shop.cycleResetAt,
        }
      : null;
  } catch (err) {
    logger.error("getActiveSubscription failed", { shopDomain, error: String(err) });
    return null;
  }
}

/**
 * Deduct credits from the shop's local counter and report the usage event.
 * Called by the worker after a task completes.
 */
export async function consumeCredits(
  shopDomain: string,
  taskId: string,
  credits: number,
): Promise<void> {
  if (credits <= 0) return;

  await prisma.shop.update({
    where: { shopDomain },
    data: {
      creditsUsedCycle: { increment: credits },
      creditsRemaining: { decrement: credits },
    },
  });

  await reportAppEvent({
    shop_domain: shopDomain,
    task_id: taskId,
    event_name: "CREDIT_USED",
    credits,
    payload: { consumed_at: new Date().toISOString() },
  });
}

/** Reference URL for the App Events API (used in docs/comments). */
export const APP_EVENTS_API_REFERENCE = APP_EVENTS_API_URL;

// =============================================================================
// FIX #12: Credit Cycle Reset — resets credits when billing cycle expires
// =============================================================================

const PLAN_CREDITS: Record<string, number> = {
  FREE: 100,
  GROWTH: 1000,
  PRO: 10000,
  PRIVATE_TEST: 999999,
};

/**
 * Check if the billing cycle has expired and reset credits if so.
 * Called before every task creation and hourly by the worker.
 */
export async function resetCreditCycleIfDue(shopDomain: string): Promise<boolean> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { plan: true, cycleResetAt: true, creditsRemaining: true },
  });

  if (!shop) return false;

  // PRIVATE_TEST never resets (unlimited)
  if (shop.plan === "PRIVATE_TEST") return false;

  // If no cycleResetAt set, initialize it to 30 days from now
  if (!shop.cycleResetAt) {
    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.shop.update({
      where: { shopDomain },
      data: {
        creditsRemaining: PLAN_CREDITS[shop.plan] ?? 100,
        creditsUsedCycle: 0,
        cycleResetAt: nextReset,
      },
    });
    logger.info("Credit cycle initialized", { shopDomain, nextReset });
    return true;
  }

  // If cycle has expired, reset
  if (shop.cycleResetAt < new Date()) {
    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const newCredits = PLAN_CREDITS[shop.plan] ?? 100;
    await prisma.shop.update({
      where: { shopDomain },
      data: {
        creditsRemaining: newCredits,
        creditsUsedCycle: 0,
        cycleResetAt: nextReset,
      },
    });
    logger.info("Credit cycle reset", { shopDomain, newCredits, nextReset });
    return true;
  }

  return false;
}

/**
 * FIX #4: Check if the shop has enough credits for a task.
 * Returns { allowed, remaining, plan }.
 */
export async function checkCredits(shopDomain: string): Promise<{
  allowed: boolean;
  remaining: number;
  plan: string;
  message?: string;
}> {
  // Reset cycle first (in case it expired)
  await resetCreditCycleIfDue(shopDomain);

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { creditsRemaining: true, plan: true },
  });

  if (!shop) return { allowed: false, remaining: 0, plan: "UNKNOWN", message: "Shop not found" };

  // PRIVATE_TEST always allowed
  if (shop.plan === "PRIVATE_TEST") {
    return { allowed: true, remaining: 999999, plan: shop.plan };
  }

  if (shop.creditsRemaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      plan: shop.plan,
      message: "You have no credits remaining. Upgrade your plan or wait for the next billing cycle.",
    };
  }

  return { allowed: true, remaining: shop.creditsRemaining, plan: shop.plan };
}
