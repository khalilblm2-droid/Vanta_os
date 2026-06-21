// =============================================================================
// VANTA OS — /api/billing (Section 5.3, Section 9.7)
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getActiveSubscription } from "~/lib/billing/app-events";
import { getSecurityHeaders } from "~/lib/security/headers";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const sub = await getActiveSubscription(ctx.shopDomain);
  return json({
    plan: sub?.plan ?? "FREE",
    status: sub?.status ?? "ACTIVE",
    creditsRemaining: sub?.creditsRemaining ?? 0,
    creditsUsedCycle: sub?.creditsUsedCycle ?? 0,
    cycleResetAt: sub?.cycleResetAt?.toISOString() ?? null,
  });
}
