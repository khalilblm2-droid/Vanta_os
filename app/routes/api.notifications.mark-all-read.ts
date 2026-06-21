// =============================================================================
// VANTA OS — POST /api/notifications/mark-all-read
// =============================================================================

import type { ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  await prisma.notification.updateMany({
    where: { shopDomain: ctx.shopDomain, read: false },
    data: { read: true },
  });
  return json({ ok: true });
}
