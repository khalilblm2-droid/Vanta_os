// =============================================================================
// VANTA OS — DELETE /api/recurring-missions/:id (Section 33)
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
  const id = args.params.id!;

  await prisma.recurringMission.deleteMany({
    where: { id, shopDomain: ctx.shopDomain },
  });

  return json({ ok: true });
}
