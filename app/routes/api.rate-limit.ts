// =============================================================================
// VANTA OS — /api/rate-limit (Section 53)
// Returns current Shopify API rate limit consumption for the shop.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const snapshot = await prisma.rateLimitSnapshot.findFirst({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { recordedAt: "desc" },
  });
  if (!snapshot) {
    return json({ available: null, percent: null, healthy: null });
  }
  const percent = Math.round((snapshot.currentlyAvailable / Math.max(1, snapshot.maximumAvailable ?? 1)) * 100);
  const healthy = percent > 30 ? "green" : percent > 15 ? "yellow" : "red";
  return json({
    available: snapshot.currentlyAvailable,
    maximum: snapshot.maximumAvailable,
    percent,
    healthy,
    recordedAt: snapshot.recordedAt.toISOString(),
  });
}
