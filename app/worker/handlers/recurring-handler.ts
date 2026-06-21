// =============================================================================
// VANTA OS — Recurring Missions (Section 33, Section 84)
// Scheduled re-runs of a saved prompt. Timezone-aware (uses the shop's
// ianaTimezone pulled at install time).
// =============================================================================

import type { Job } from "bullmq";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { enqueueTask, type RecurringJobPayload } from "~/lib/queue/task-queue";

export async function processRecurringJob(
  job: Job<RecurringJobPayload>,
): Promise<{ status: string; taskId?: string }> {
  const { missionId, shopDomain } = job.data;
  logger.info("Recurring mission firing", { missionId, shopDomain });

  const mission = await prisma.recurringMission.findUnique({
    where: { id: missionId },
    include: { shop: { select: { id: true, agentPersona: true, killSwitchEnabled: true } } },
  });

  if (!mission || !mission.enabled) {
    logger.info("Recurring mission disabled or missing — skipping", { missionId });
    return { status: "SKIPPED" };
  }

  // Section 43 — kill switch
  if (mission.shop.killSwitchEnabled) {
    logger.warn("Kill switch on — skipping recurring mission", { missionId, shopDomain });
    return { status: "KILL_SWITCH" };
  }

  // Create a new Task with isRecurring=true + link to the mission
  const task = await prisma.task.create({
    data: {
      shopId: mission.shop.id,
      shopDomain,
      command: mission.prompt,
      language: "en",
      persona: mission.shop.agentPersona,
      status: "QUEUED",
      priority: "NORMAL",
      isRecurring: true,
      recurringMissionId: missionId,
      estimatedCredits: 1,
      requiresApproval: false, // Recurring tasks skip approval (merchant pre-approved at save time)
    },
  });

  await prisma.recurringMission.update({
    where: { id: missionId },
    data: {
      lastRunAt: new Date(),
      runCount: { increment: 1 },
    },
  });

  await enqueueTask(
    {
      taskId: task.id,
      shopDomain,
      enqueuedAt: new Date().toISOString(),
    },
    "NORMAL",
  );

  return { status: "ENQUEUED", taskId: task.id };
}

/**
 * Re-register all BullMQ repeatable jobs from the RecurringMission table.
 * Called on worker boot to ensure schedules survive Redis flushes.
 *
 * Section 84 — uses the shop's ianaTimezone for cron evaluation.
 */
export async function syncRecurringSchedules(): Promise<{ synced: number }> {
  const missions = await prisma.recurringMission.findMany({
    where: { enabled: true },
    include: { shop: { select: { ianaTimezone: true } } },
  });

  // We use BullMQ's repeatable job API to register cron schedules.
  // Each mission becomes a repeatable job on the recurring queue.
  const { getRecurringQueue } = await import("~/lib/queue/task-queue");
  const queue = getRecurringQueue();

  let synced = 0;
  for (const mission of missions) {
    // Remove existing repeatable job first (idempotent)
    try {
      const existing = await queue.getRepeatableJobs();
      for (const job of existing) {
        if (job.id?.includes(mission.id)) {
          await queue.removeRepeatableByKey(job.key);
        }
      }
    } catch (err) {
      logger.warn("Failed to clear existing repeatable job", {
        missionId: mission.id,
        error: String(err),
      });
    }

    // Register new repeatable job
    try {
      await queue.add(
        `recurring:${mission.id}`,
        { missionId: mission.id, shopDomain: mission.shopDomain },
        {
          repeat: {
            pattern: mission.cron,
            tz: mission.timezone || mission.shop.ianaTimezone || "UTC",
          },
          jobId: `repeating:${mission.id}`,
        },
      );
      synced++;
    } catch (err) {
      logger.error("Failed to register recurring mission", {
        missionId: mission.id,
        cron: mission.cron,
        error: String(err),
      });
    }
  }

  logger.info("Recurring mission schedules synced", { synced, total: missions.length });
  return { synced };
}
