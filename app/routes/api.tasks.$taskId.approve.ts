// =============================================================================
// VANTA OS — POST /api/tasks/:id/approve (Section 8, Section 10, Section 30)
// Approve or reject a task in AWAITING_APPROVAL state.
// =============================================================================

import type { ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, ApproveTaskSchema } from "~/lib/validation/schemas";
import { enqueueTask } from "~/lib/queue/task-queue";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId!;
  const body = await args.request.json();
  const input = validate(ApproveTaskSchema, { taskId, ...body });

  const task = await prisma.task.findFirst({
    where: { id: input.taskId, shopDomain: ctx.shopDomain },
  });
  if (!task) {
    return json({ error: "not_found" }, { status: 404 });
  }
  if (task.status !== "AWAITING_APPROVAL") {
    return json({ error: "not_awaiting_approval", status: task.status }, { status: 409 });
  }

  if (input.approved) {
    // Mark as approved + re-enqueue for execution
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "QUEUED",
        approvedByStaffId: ctx.staffId,
        approvedAt: new Date(),
        requiresApproval: false, // Already approved
      },
    });
    await enqueueTask(
      {
        taskId: task.id,
        shopDomain: ctx.shopDomain,
        staffId: ctx.staffId,
        enqueuedAt: new Date().toISOString(),
      },
      task.priority,
    );
    return json({ ok: true, status: "QUEUED" });
  }

  // Rejected
  await prisma.task.update({
    where: { id: task.id },
    data: { status: "CANCELLED" },
  });
  return json({ ok: true, status: "CANCELLED" });
}
