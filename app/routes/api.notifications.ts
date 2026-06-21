// =============================================================================
// VANTA OS — /api/notifications (Section 78)
// GET /api/notifications
// POST /api/notifications/:id/read
// POST /api/notifications/mark-all-read
// =============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);

  const items = await prisma.notification.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return json({
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      severity: n.severity,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
