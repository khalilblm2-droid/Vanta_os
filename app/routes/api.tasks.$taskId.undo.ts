// =============================================================================
// VANTA OS — POST /api/tasks/:id/undo (Section 22)
// =============================================================================

import type { ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { shopify } from "~/lib/shopify/auth.server";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { undoTask } from "~/worker/handlers/undo-handler";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId!;

  const task = await prisma.task.findFirst({
    where: { id: taskId, shopDomain: ctx.shopDomain },
  });
  if (!task) return json({ error: "not_found" }, { status: 404 });
  if (task.status !== "COMPLETED") {
    return json({ error: "not_completed", status: task.status }, { status: 409 });
  }

  // Build offline admin client
  const sessions = await prisma.session.findMany({
    where: { shop: ctx.shopDomain },
    orderBy: { expires: "desc" },
    take: 5,
  });
  const valid = sessions.find((s) => !s.expires || s.expires > new Date());
  if (!valid) {
    return json({ error: "no_valid_session" }, { status: 401 });
  }
  const admin = shopify.admin(valid as never);

  const result = await undoTask(admin, taskId, ctx.shopDomain);
  return json(result, { status: result.success ? 200 : 500 });
}
