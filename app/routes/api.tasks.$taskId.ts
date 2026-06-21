// =============================================================================
// VANTA OS — GET /api/tasks/:id (Section 7 — frontend polls this every 2-3s)
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

  const task = await prisma.task.findFirst({
    where: { id: taskId, shopDomain: ctx.shopDomain },
    include: {
      staff: { select: { name: true } },
      _count: { select: { undoSnapshots: true } },
    },
  });

  if (!task) {
    return json({ error: "not_found" }, { status: 404 });
  }

  return json({
    id: task.id,
    command: task.command,
    status: task.status,
    priority: task.priority,
    output: task.output ?? undefined,
    errorMessage: task.errorMessage ?? undefined,
    confidenceScore: task.confidenceScore ?? undefined,
    blastRadius: task.blastRadius,
    blastRadiusDescription: task.blastRadiusDescription ?? undefined,
    requiresApproval: task.requiresApproval,
    initiatedByStaffName: task.staff?.name ?? undefined,
    createdAt: task.createdAt.toISOString(),
    thinkingAt: task.thinkingAt?.toISOString(),
    executingAt: task.executingAt?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
    failedAt: task.failedAt?.toISOString(),
    undoable: task._count.undoSnapshots > 0 && task.status === "COMPLETED",
    deepLinks: task.deepLinks as Array<{ label: string; url: string }> | null,
  });
}
