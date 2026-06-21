// =============================================================================
// VANTA OS — POST /api/tasks/:id/cancel (FIX #6)
// Actually cancels a running task — both in DB and in BullMQ queue.
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
  const taskId = args.params.taskId!;

  const task = await prisma.task.findFirst({
    where: { id: taskId, shopDomain: ctx.shopDomain },
    select: { id: true, status: true },
  });

  if (!task) {
    return json({ error: "not_found" }, { status: 404 });
  }

  // Only allow cancelling non-terminal tasks
  if (!["QUEUED", "THINKING", "EXECUTING", "AWAITING_APPROVAL"].includes(task.status)) {
    return json({ error: "not_cancellable", status: task.status }, { status: 409 });
  }

  // 1. Update DB status to CANCELLED
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "CANCELLED" },
  });

  // 2. Remove the job from BullMQ queue (if still queued)
  try {
    const { getTaskQueue } = await import("~/lib/queue/task-queue");
    const queue = getTaskQueue();
    const job = await queue.getJob(taskId);
    if (job) {
      await job.remove();
    }
  } catch {
    // Job might already be processing or removed — that's OK
  }

  // 3. Log the cancellation
  await prisma.taskLog.create({
    data: {
      taskId,
      shopDomain: ctx.shopDomain,
      step: "cancelled",
      level: "INFO",
      message: `Task cancelled by staff ${ctx.staffId}`,
    },
  });

  return json({ ok: true, status: "CANCELLED" });
}
