// =============================================================================
// VANTA OS — BullMQ Task Queue (Section 7, Section 54)
// Web server only enqueues jobs. Worker process consumes them.
// All task state lives in Postgres (Section 7) — Redis holds only the queue.
//
// Priority support: LOW=1, NORMAL=5, HIGH=8, URGENT=10 (Section 54)
// =============================================================================

import { Queue, QueueEvents } from "bullmq";
import { getRedis } from "~/lib/queue/redis";
import { logger } from "~/lib/logger.server";

export const TASK_QUEUE_NAME = "vanta:tasks";
export const GUARDIAN_QUEUE_NAME = "vanta:guardian";
export const RECURRING_QUEUE_NAME = "vanta:recurring";
export const WEBHOOK_QUEUE_NAME = "vanta:webhooks";

export interface TaskJobPayload {
  taskId: string;
  shopDomain: string;
  staffId?: string;
  /** ISO timestamp of enqueue — for duplicate detection (Section 59) */
  enqueuedAt: string;
}

export interface GuardianJobPayload {
  shopDomain: string;
  checkType: "PRICE_ZERO" | "LOW_INVENTORY" | "BROKEN_LINK" | "FULL_SWEEP";
}

export interface RecurringJobPayload {
  missionId: string;
  shopDomain: string;
}

export interface WebhookJobPayload {
  webhookId: string;
  topic: string;
  shopDomain: string;
  payload: unknown;
}

// --- Priority mapping (Section 54) -------------------------------------------
// BullMQ opts.priority: higher = processed first
const PRIORITY_MAP = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 8,
  URGENT: 10,
} as const;

let _taskQueue: Queue<TaskJobPayload> | null = null;
let _guardianQueue: Queue<GuardianJobPayload> | null = null;
let _recurringQueue: Queue<RecurringJobPayload> | null = null;
let _webhookQueue: Queue<WebhookJobPayload> | null = null;
let _queueEvents: QueueEvents | null = null;

/** Task queue — used by web process to enqueue, by worker to consume. */
export function getTaskQueue(): Queue<TaskJobPayload> {
  if (_taskQueue) return _taskQueue;
  _taskQueue = new Queue<TaskJobPayload>(TASK_QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3, // Section 41 — retry on transient failures
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { count: 200, age: 60 * 60 * 24 }, // 24h
      removeOnFail: { count: 500, age: 60 * 60 * 24 * 7 }, // 7d
    },
  });
  return _taskQueue;
}

/** Guardian queue — Section 34 proactive checks. */
export function getGuardianQueue(): Queue<GuardianJobPayload> {
  if (_guardianQueue) return _guardianQueue;
  _guardianQueue = new Queue<GuardianJobPayload>(GUARDIAN_QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { count: 100, age: 60 * 60 * 24 },
      removeOnFail: { count: 200, age: 60 * 60 * 24 * 7 },
    },
  });
  return _guardianQueue;
}

/** Recurring mission queue — Section 33 repeatable jobs. */
export function getRecurringQueue(): Queue<RecurringJobPayload> {
  if (_recurringQueue) return _recurringQueue;
  _recurringQueue = new Queue<RecurringJobPayload>(RECURRING_QUEUE_NAME, {
    connection: getRedis(),
  });
  return _recurringQueue;
}

/** Webhook processing queue — defer webhook work off the HTTP request. */
export function getWebhookQueue(): Queue<WebhookJobPayload> {
  if (_webhookQueue) return _webhookQueue;
  _webhookQueue = new Queue<WebhookJobPayload>(WEBHOOK_QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { count: 1000, age: 60 * 60 * 24 * 7 },
      removeOnFail: { count: 500, age: 60 * 60 * 24 * 30 },
    },
  });
  return _webhookQueue;
}

/** QueueEvents for listening on completed/failed events from any process. */
export function getQueueEvents(): QueueEvents {
  if (_queueEvents) return _queueEvents;
  _queueEvents = new QueueEvents(TASK_QUEUE_NAME, { connection: getRedis() });
  _queueEvents.on("completed", ({ jobId, returnvalue }) => {
    logger.info("BullMQ job completed", { jobId, returnvalue });
  });
  _queueEvents.on("failed", ({ jobId, failedReason }) => {
    logger.error("BullMQ job failed", { jobId, reason: failedReason });
  });
  return _queueEvents;
}

/**
 * Enqueue a task with priority support (Section 54).
 * Returns the BullMQ job id (separate from the Task.id — Task.id is the source of truth).
 */
export async function enqueueTask(
  payload: TaskJobPayload,
  priority: keyof typeof PRIORITY_MAP = "NORMAL",
): Promise<string> {
  const queue = getTaskQueue();
  const job = await queue.add(`task:${payload.taskId}`, payload, {
    priority: PRIORITY_MAP[priority],
    jobId: payload.taskId, // dedupe by taskId
  });
  logger.info("Task enqueued", {
    taskId: payload.taskId,
    shopDomain: payload.shopDomain,
    priority,
    bullmqJobId: job.id,
  });
  return job.id ?? payload.taskId;
}

/** Enqueue a Guardian check. */
export async function enqueueGuardianCheck(
  payload: GuardianJobPayload,
): Promise<string> {
  const queue = getGuardianQueue();
  const job = await queue.add(`guardian:${payload.shopDomain}:${payload.checkType}`, payload);
  return job.id ?? "";
}

/** Enqueue a recurring mission run. */
export async function enqueueRecurringMission(
  payload: RecurringJobPayload,
): Promise<string> {
  const queue = getRecurringQueue();
  const job = await queue.add(`recurring:${payload.missionId}`, payload, {
    jobId: `recurring-${payload.missionId}-${Date.now()}`,
  });
  return job.id ?? "";
}

/** Enqueue deferred webhook processing. */
export async function enqueueWebhook(payload: WebhookJobPayload): Promise<string> {
  const queue = getWebhookQueue();
  const job = await queue.add(`webhook:${payload.topic}:${payload.webhookId}`, payload, {
    jobId: payload.webhookId, // dedupe on Shopify's webhook id
  });
  return job.id ?? "";
}

/** Close all queues — used in tests + graceful worker shutdown. */
export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    _taskQueue?.close(),
    _guardianQueue?.close(),
    _recurringQueue?.close(),
    _webhookQueue?.close(),
    _queueEvents?.close(),
  ]);
  _taskQueue = null;
  _guardianQueue = null;
  _recurringQueue = null;
  _webhookQueue = null;
  _queueEvents = null;
}
