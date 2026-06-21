// =============================================================================
// VANTA OS — Multi-tenant scoping helper (Section 44)
// EVERY database query, background job, and API call MUST be scoped to the
// specific merchant's shop_domain or shop_id. Never execute an unscoped query.
// This helper centralizes the where-clause pattern and provides assertions.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";

/**
 * Prisma where-clause fragment that scopes a query to a single shop.
 * Use this in EVERY findMany/findFirst/updateMany/deleteMany call:
 *
 *   await prisma.task.findMany({ where: { ...shopScoped(shopDomain), status: 'QUEUED' } })
 */
export function shopScoped(shopDomain: string): { shopDomain: string } {
  assertShopDomain(shopDomain);
  return { shopDomain };
}

/**
 * Assert that a shopDomain is valid and present.
 * Throws if missing — fail-fast to prevent cross-tenant leakage.
 */
export function assertShopDomain(shopDomain: string | null | undefined): asserts shopDomain is string {
  if (!shopDomain || typeof shopDomain !== "string" || shopDomain.trim() === "") {
    logger.error("Multi-tenant assertion failed — missing shopDomain", { shopDomain });
    throw new Error("FATAL: shopDomain is required for this operation (Section 44)");
  }
}

/**
 * Fetch a shop row by domain. Throws if not found.
 * Use this to verify a shop exists before any task enqueue.
 */
export async function getShopOrThrow(shopDomain: string) {
  assertShopDomain(shopDomain);
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    throw new Error(`Shop not found: ${shopDomain}`);
  }
  if (!shop.installed) {
    throw new Error(`Shop is not installed: ${shopDomain}`);
  }
  if (shop.killSwitchEnabled) {
    throw new Error(`Kill switch is enabled for shop ${shopDomain} — agent is globally disabled (Section 43)`);
  }
  return shop;
}

/**
 * Check the kill-switch before enqueuing a task (Section 43).
 * Returns true if the agent is globally disabled for this shop.
 */
export async function isKillSwitchOn(shopDomain: string): Promise<boolean> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { killSwitchEnabled: true },
  });
  return Boolean(shop?.killSwitchEnabled);
}

/**
 * Resolve the active language for a shop, considering merchant override (Section 12).
 */
export async function getShopLanguage(shopDomain: string): Promise<"en" | "ar"> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { preferredLanguage: true },
  });
  return (shop?.preferredLanguage as "en" | "ar") ?? "en";
}
