// =============================================================================
// VANTA OS — GET /api/tasks/:id/diff + /api/tasks/:id/logs
// Section 60 (diff) + Section 7 (logs)
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
  const taskId = args.params.taskId!;

  const [diffs, logs] = await Promise.all([
    prisma.taskDiff.findMany({
      where: { taskId, shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "asc" },
    }),
    prisma.taskLog.findMany({
      where: { taskId, shopDomain: ctx.shopDomain },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  return json({
    diffs: diffs.map((d) => ({
      id: d.id,
      resourceType: d.resourceType,
      resourceId: d.resourceId,
      resourceTitle: d.resourceTitle,
      field: d.field,
      before: d.before,
      after: d.after,
      timestamp: d.timestamp.toISOString(),
    })),
    logs: logs.map((l) => ({
      id: l.id,
      step: l.step,
      level: l.level,
      message: l.message,
      timestamp: l.timestamp.toISOString(),
    })),
  });
}
