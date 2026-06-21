// =============================================================================
// VANTA OS — Task Handler (Section 7, Section 22, Section 23, Section 30)
// The BullMQ job processor. Runs inside the worker process.
//
// Pipeline per task (Section 7):
//   QUEUED → THINKING (call Gemini, plan the action)
//         → EXECUTING (call Shopify Admin API)
//         → COMPLETED / ERROR
//
// All task state lives in Postgres — a worker restart never silently loses a
// task. The BullMQ job is just a "wake up and process this taskId" trigger.
// =============================================================================

import type { Job } from "bullmq";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { shopify } from "~/lib/shopify/auth.server";
import { runAgent } from "~/lib/ai/agent";
import type { TaskJobPayload } from "~/lib/queue/task-queue";
import { consumeCredits } from "~/lib/billing/app-events";
import { sendTaskCompleteEmail } from "~/lib/email/resend";
import { createNotification } from "~/lib/notifications";
import { isKillSwitchOn } from "~/lib/shopify/multi-tenant";

/**
 * Process a task job from the queue.
 * Called by the BullMQ worker (worker/index.ts).
 */
export async function processTaskJob(job: Job<TaskJobPayload>): Promise<{
  status: string;
  taskId: string;
}> {
  const { taskId, shopDomain } = job.data;
  logger.info("Processing task job", { taskId, shopDomain, jobId: job.id });

  // Section 43 — kill switch checked FIRST
  if (await isKillSwitchOn(shopDomain)) {
    logger.warn("Kill switch on — cancelling task", { taskId, shopDomain });
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "CANCELLED" },
    });
    await createNotification(shopDomain, {
      type: "SYSTEM",
      severity: "WARNING",
      title: "Task cancelled — agent disabled",
      body: `Task "${taskId}" was cancelled because the global Kill Switch is enabled.`,
      link: "/app/settings",
    });
    return { status: "CANCELLED", taskId };
  }

  // Load the task row
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { shop: true },
  });

  if (!task) {
    logger.error("Task not found in DB", { taskId, shopDomain });
    return { status: "NOT_FOUND", taskId };
  }

  // Section 76-style idempotency: if task is already terminal, skip
  if (["COMPLETED", "ERROR", "CANCELLED", "REVERTED"].includes(task.status)) {
    logger.info("Task already terminal — skipping", { taskId, status: task.status });
    return { status: task.status, taskId };
  }

  // Section 59 — duplicate task detection (within last 60s, same command, still pending)
  const recentDuplicate = await prisma.task.findFirst({
    where: {
      shopDomain,
      command: task.command,
      id: { not: taskId },
      status: { in: ["QUEUED", "THINKING", "EXECUTING", "AWAITING_APPROVAL"] },
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
    select: { id: true },
  });
  if (recentDuplicate) {
    logger.warn("Duplicate task detected — skipping", { taskId, duplicateOf: recentDuplicate.id });
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "CANCELLED",
        errorMessage:
          "This task is already running. Please wait for it to complete before submitting again.",
      },
    });
    return { status: "DUPLICATE_CANCELLED", taskId };
  }

  try {
    // Build an offline Admin API context for this shop.
    // The worker doesn't have an HTTP request, so we use the session storage
    // to look up the most recent valid session for this shop and construct
    // an admin client from it.
    const sessions = await prisma.session.findMany({
      where: { shop: shopDomain },
      orderBy: { expires: "desc" },
      take: 5,
    });
    const validSession = sessions.find((s) => !s.expires || s.expires > new Date());
    if (!validSession) {
      throw new Error(
        `No valid session for shop ${shopDomain}. Merchant may need to re-authorize.`,
      );
    }

    // Construct the admin context from the cached session.
    // shopify.admin() builds the offline admin client for a given session.
    const admin = shopify.admin(validSession as never);

    // Run the agent orchestrator
    const result = await runAgent({
      taskId,
      shopDomain,
      shopId: task.shopId,
      staffId: task.staffId ?? undefined,
      command: task.command,
      language: task.language,
      persona: task.shop.agentPersona,
      threadParentId: task.threadParentId ?? undefined,
      csvAttachmentUrl: task.csvAttachmentUrl ?? undefined,
      permissions: {
        canWriteProducts: task.shop.canWriteProducts,
        canWriteCollections: task.shop.canWriteCollections,
        canWriteInventory: task.shop.canWriteInventory,
        canWriteMetafields: task.shop.canWriteMetafields,
        canWriteThemes: task.shop.canWriteThemes,
        canReadOrders: task.shop.canReadOrders,
        canReadCustomers: task.shop.canReadCustomers,
      },
      // Inject admin into context — agent runs tools against this offline admin client
      admin: admin as never,
    } as never);

    // Report usage + send notifications
    if (result.status === "COMPLETED") {
      await consumeCredits(shopDomain, taskId, task.estimatedCredits);

      // Section 56 — optional email notification
      if (
        task.shop.emailNotifications &&
        task.shop.notifyOnTaskComplete &&
        task.shop.email
      ) {
        await sendTaskCompleteEmail({
          to: task.shop.email,
          shopDomain,
          taskId,
          command: task.command,
          summary: result.output.slice(0, 500),
          deepLink: `https://${shopDomain}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}/app/history/${taskId}`,
        });
      }

      await createNotification(shopDomain, {
        type: "TASK_COMPLETED",
        severity: "SUCCESS",
        title: "Task completed",
        body: `Command: "${task.command.slice(0, 80)}${task.command.length > 80 ? "…" : ""}"`,
        link: `/app/history/${taskId}`,
      });
    } else if (result.status === "ERROR") {
      await createNotification(shopDomain, {
        type: "TASK_FAILED",
        severity: "ERROR",
        title: "Task failed",
        body: `Command: "${task.command.slice(0, 80)}${task.command.length > 80 ? "…" : ""}" — ${result.error ?? "Unknown error"}`,
        link: `/app/history/${taskId}`,
      });
    } else if (result.status === "AWAITING_APPROVAL") {
      await createNotification(shopDomain, {
        type: "TASK_QUEUED",
        severity: "WARNING",
        title: "Approval required",
        body: `Task requires your approval before executing. Blast radius: ${result.blastRadius ?? 0} item(s).`,
        link: `/app/history/${taskId}`,
      });
    }

    return { status: result.status, taskId };
  } catch (err) {
    logger.error("Task job threw", { taskId, shopDomain, error: String(err) });
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "ERROR",
        errorMessage: err instanceof Error ? err.message : String(err),
        failedAt: new Date(),
      },
    });
    await createNotification(shopDomain, {
      type: "TASK_FAILED",
      severity: "ERROR",
      title: "Task failed — system error",
      body: `Task "${task.command.slice(0, 80)}" failed due to a system error: ${err instanceof Error ? err.message : "unknown"}`,
      link: `/app/history/${taskId}`,
    });
    return { status: "ERROR", taskId };
  }
}
