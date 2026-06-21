// =============================================================================
// VANTA OS — /api/audit-log (Section 62)
// Returns the granular permission audit log for the shop.
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
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

  const [scopeLogs, auditLogs] = await Promise.all([
    prisma.scopeAuditLog.findMany({
      where: { shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "desc" },
      take: limit,
    }),
    prisma.auditLog.findMany({
      where: { shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "desc" },
      take: limit,
    }),
  ]);

  return json({
    scopeAuditLog: scopeLogs.map((l) => ({
      id: l.id,
      scope: l.scope,
      taskId: l.taskId,
      endpoint: l.endpoint,
      timestamp: l.timestamp.toISOString(),
    })),
    auditLog: auditLogs.map((l) => ({
      id: l.id,
      staffId: l.staffId,
      taskId: l.taskId,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      timestamp: l.timestamp.toISOString(),
    })),
  });
}
