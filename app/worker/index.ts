// =============================================================================
// VANTA OS — Worker Entry Point (Section 7, Section 43, Section 83)
//
// Boots a BullMQ worker process that:
//   - Consumes tasks from vanta:tasks queue
//   - Runs Guardian Mode periodic checks (Section 34)
//   - Runs Recurring Mission cron jobs (Section 33)
//   - Enforces the kill switch before each task (Section 43)
//   - Handles SIGTERM/SIGINT gracefully (Section 83):
//       1. Stop accepting new jobs immediately
//       2. Allow currently-executing jobs up to 30s grace period
//       3. Log "Worker shutting down gracefully" with current job id
//       4. Exit cleanly
//
// Run with: npm run start:worker
// =============================================================================

import { Worker, type Job } from "bullmq";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { loadEnv } from "~/lib/env.server";
import {
  TASK_QUEUE_NAME,
  GUARDIAN_QUEUE_NAME,
  RECURRING_QUEUE_NAME,
  type TaskJobPayload,
  type GuardianJobPayload,
  type RecurringJobPayload,
} from "~/lib/queue/task-queue";
import { getWorkerRedis } from "~/lib/queue/redis";
import { shopify } from "~/lib/shopify/auth.server";
import { processTaskJob } from "~/worker/handlers/task-handler";
import { processGuardianJob } from "~/worker/handlers/guardian-handler";
import { processRecurringJob, syncRecurringSchedules } from "~/worker/handlers/recurring-handler";

const GRACEFUL_SHUTDOWN_MS = 30_000;

let taskWorker: Worker<TaskJobPayload> | null = null;
let guardianWorker: Worker<GuardianJobPayload> | null = null;
let recurringWorker: Worker<RecurringJobPayload> | null = null;
let isShuttingDown = false;

async function main() {
  loadEnv(); // Validate env at boot
  logger.info("VANTA OS worker starting", {
    env: process.env.APP_ENV,
    concurrency: loadEnv().BULLMQ_CONCURRENCY,
    apiVersion: loadEnv().SHOPIFY_API_VERSION,
  });

  // Initialize shopify-app-remix so shopify.admin() works in the worker.
  // The worker uses offline sessions to construct admin clients.
  // (shopify import above is for side-effect + the admin() method.)

  // --- Task worker ---------------------------------------------------------
  taskWorker = new Worker<TaskJobPayload>(
    TASK_QUEUE_NAME,
    async (job: Job<TaskJobPayload>) => processTaskJob(job),
    {
      connection: getWorkerRedis(),
      concurrency: loadEnv().BULLMQ_CONCURRENCY,
    },
  );

  taskWorker.on("active", (job) => {
    logger.info("Task job active", { jobId: job.id, taskId: job.data.taskId });
  });
  taskWorker.on("completed", (job, result) => {
    logger.info("Task job completed", {
      jobId: job.id,
      taskId: job.data.taskId,
      result,
    });
  });
  taskWorker.on("failed", (job, err) => {
    logger.error("Task job failed in worker", {
      jobId: job?.id,
      taskId: job?.data.taskId,
      error: err.message,
    });
  });

  // --- Guardian worker -----------------------------------------------------
  guardianWorker = new Worker<GuardianJobPayload>(
    GUARDIAN_QUEUE_NAME,
    async (job: Job<GuardianJobPayload>) => {
      // Build offline admin for this shop
      const sessions = await prisma.session.findMany({
        where: { shop: job.data.shopDomain },
        orderBy: { expires: "desc" },
        take: 5,
      });
      const valid = sessions.find((s) => !s.expires || s.expires > new Date());
      if (!valid) {
        throw new Error(`No valid session for shop ${job.data.shopDomain}`);
      }
      const admin = shopify.admin(valid as never);
      return processGuardianJob(admin, job.data);
    },
    {
      connection: getWorkerRedis(),
      concurrency: 1, // Guardian checks are heavy — run sequentially
    },
  );

  guardianWorker.on("failed", (job, err) => {
    logger.error("Guardian job failed", { jobId: job?.id, error: err.message });
  });

  // --- Recurring mission worker --------------------------------------------
  recurringWorker = new Worker<RecurringJobPayload>(
    RECURRING_QUEUE_NAME,
    async (job: Job<RecurringJobPayload>) => processRecurringJob(job),
    {
      connection: getWorkerRedis(),
      concurrency: 1,
    },
  );

  recurringWorker.on("failed", (job, err) => {
    logger.error("Recurring mission job failed", { jobId: job?.id, error: err.message });
  });

  // --- Re-register repeatable cron jobs (Section 33) -----------------------
  await syncRecurringSchedules();

  // --- Schedule periodic Guardian sweeps (Section 34) ----------------------
  // Every shop with guardian mode enabled gets a FULL_SWEEP check every 6h.
  setInterval(async () => {
    try {
      const shops = await prisma.shop.findMany({
        where: {
          installed: true,
          killSwitchEnabled: false,
          guardianModeEnabled: true,
        },
        select: { shopDomain: true, guardianIntervalHours: true },
      });
      const { enqueueGuardianCheck } = await import("~/lib/queue/task-queue");
      for (const shop of shops) {
        await enqueueGuardianCheck({
          shopDomain: shop.shopDomain,
          checkType: "FULL_SWEEP",
        });
      }
      logger.info("Guardian sweep scheduled", { shopCount: shops.length });
    } catch (err) {
      logger.error("Guardian sweep scheduling failed", { error: String(err) });
    }
  }, 60 * 60 * 1000); // Check hourly which shops are due for a sweep

  logger.info("VANTA OS worker ready", {
    queues: [TASK_QUEUE_NAME, GUARDIAN_QUEUE_NAME, RECURRING_QUEUE_NAME],
  });

  // --- Graceful shutdown wiring (Section 83) --------------------------------
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info("Worker shutting down gracefully — received signal", { signal });

  // Step 1: Stop accepting new jobs immediately
  // Step 2: Allow currently-executing jobs up to 30s grace period
  const shutdownPromises: Promise<unknown>[] = [];
  if (taskWorker) {
    const currentJob = await taskWorker.getActive();
    if (currentJob) {
      logger.info("Worker has in-flight task — waiting up to 30s", {
        jobId: currentJob.id,
        taskId: currentJob.data.taskId,
      });
    }
    shutdownPromises.push(
      taskWorker.close(false).then(() => logger.info("Task worker closed", { signal })),
    );
  }
  if (guardianWorker) {
    shutdownPromises.push(
      guardianWorker.close(false).then(() => logger.info("Guardian worker closed", { signal })),
    );
  }
  if (recurringWorker) {
    shutdownPromises.push(
      recurringWorker.close(false).then(() => logger.info("Recurring worker closed", { signal })),
    );
  }

  // Race against the 30s grace period
  await Promise.race([
    Promise.allSettled(shutdownPromises),
    new Promise((resolve) => setTimeout(resolve, GRACEFUL_SHUTDOWN_MS)),
  ]);

  // Step 3: Close Redis connections + Prisma
  const { disconnectRedis } = await import("~/lib/queue/redis");
  await disconnectRedis();
  await prisma.$disconnect();

  // Step 4: Exit cleanly
  logger.info("Worker shutdown complete — exiting", { signal });
  process.exit(0);
}

main().catch((err) => {
  logger.error("Fatal error in worker main", { error: String(err) });
  process.exit(1);
});
