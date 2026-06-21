// =============================================================================
// VANTA OS — POST /api/tasks + GET /api/tasks (Section 7, 9, 10, 54, 59, 65)
// =============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, CreateTaskSchema } from "~/lib/validation/schemas";
import { enqueueTask } from "~/lib/queue/task-queue";
import { rateLimitTaskCreation } from "~/lib/security/rate-limit";
import { checkPromptInjection, logInjectionAttempt } from "~/lib/security/prompt-injection";
import { logger } from "~/lib/logger.server";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

// --- GET /api/tasks — list recent tasks for the shop ------------------------
export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
  const status = url.searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      ...shopScoped(ctx.shopDomain),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      staff: { select: { name: true } },
      _count: { select: { undoSnapshots: true } },
    },
  });

  return json({
    tasks: tasks.map((t) => ({
      id: t.id,
      command: t.command,
      status: t.status,
      priority: t.priority,
      output: t.output ?? undefined,
      errorMessage: t.errorMessage ?? undefined,
      confidenceScore: t.confidenceScore ?? undefined,
      blastRadius: t.blastRadius,
      requiresApproval: t.requiresApproval,
      initiatedByStaffName: t.staff?.name ?? undefined,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      undoable: t._count.undoSnapshots > 0 && t.status === "COMPLETED",
    })),
  });
}

// --- POST /api/tasks — create + enqueue a new task --------------------------
export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);

  // Section 13 — rate limit
  const rl = await rateLimitTaskCreation(ctx.shopDomain);
  if (!rl.allowed) {
    return json(
      { error: "rate_limited", retryAfter: rl.retryAfterSec, message: "Too many tasks. Please slow down." },
      { status: 429 },
    );
  }

  // Section 66 — Zod validation
  const body = await args.request.json();
  let input;
  try {
    input = validate(CreateTaskSchema, body);
  } catch (e) {
    const err = e as { fields?: Record<string, string> };
    return json({ error: "validation_failed", fields: err.fields ?? {} }, { status: 400 });
  }

  // Section 43 — kill switch
  if (ctx.shop.killSwitchEnabled) {
    return json(
      { error: "kill_switch_enabled", message: "Agent is globally disabled by the merchant." },
      { status: 403 },
    );
  }

  // FIX #4: Check credit balance before creating the task
  const { checkCredits } = await import("~/lib/billing/app-events");
  const creditCheck = await checkCredits(ctx.shopDomain);
  if (!creditCheck.allowed) {
    return json(
      {
        error: "insufficient_credits",
        message: creditCheck.message ?? "No credits remaining.",
        creditsRemaining: 0,
        plan: creditCheck.plan,
        upgradeUrl: "/app/billing",
      },
      { status: 402 },
    );
  }

  // Section 67 — prompt injection check
  const injectionCheck = checkPromptInjection(input.command);
  if (!injectionCheck.safe) {
    await logInjectionAttempt(
      ctx.shopDomain,
      input.command,
      injectionCheck.matchedPatterns,
      ctx.staffId,
    );
    return json(
      {
        error: "prompt_injection_blocked",
        message: "Your command was blocked because it matched a known prompt-injection pattern.",
        patterns: injectionCheck.matchedPatterns,
      },
      { status: 400 },
    );
  }

  // Section 59 — duplicate task detection
  const duplicate = await prisma.task.findFirst({
    where: {
      ...shopScoped(ctx.shopDomain),
      command: input.command,
      id: { not: undefined },
      status: { in: ["QUEUED", "THINKING", "EXECUTING", "AWAITING_APPROVAL"] },
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    select: { id: true },
  });
  if (duplicate) {
    return json(
      { error: "duplicate_task", message: "This task is already running. Please wait for it to complete before submitting again." },
      { status: 409 },
    );
  }

  // Create the Task row
  const task = await prisma.task.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      command: injectionCheck.sanitizedCommand,
      language: input.language,
      persona: ctx.shop.agentPersona,
      status: "QUEUED",
      priority: input.priority,
      threadParentId: input.threadParentId,
      csvAttachmentUrl: input.csvAttachmentUrl,
      estimatedCredits: input.estimatedCredits,
    },
  });

  // Section 50 — push to command history
  await prisma.commandHistory.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      command: injectionCheck.sanitizedCommand,
    },
  });

  // Enqueue the BullMQ job
  await enqueueTask(
    {
      taskId: task.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      enqueuedAt: new Date().toISOString(),
    },
    input.priority,
  );

  logger.info("Task created via API", {
    taskId: task.id,
    shopDomain: ctx.shopDomain,
    staffId: ctx.staffId,
  });

  return json(
    {
      id: task.id,
      command: task.command,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
