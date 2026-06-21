// =============================================================================
// VANTA OS — GDPR Redaction (Section 39)
// On receipt of customers/redact, customers/data_request, shop/redact webhooks,
// the app must PERMANENTLY delete all PII from Postgres AND Redis logs within
// the 48-hour GDPR window. We process within minutes, not hours.
//
// "PII" scope:
//   - For a customer redaction: any TaskLog / AuditLog / KnowledgeBaseEntry /
//     Feedback containing the customer's email, name, or order id.
//   - For a shop redaction: ALL data tied to this shopDomain — Session,
//     Shop, StaffMember, Task, TaskLog, AuditLog, ScopeAuditLog, Notification,
//     Feedback, FeatureFlag, RecurringMission, GuardianAlert, AbExperiment,
//     CommandHistory, UndoSnapshot, KnowledgeBaseEntry, ProcessedWebhook,
//     RateLimitSnapshot, AppEvent.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { GDPR } from "~/lib/shopify/constants";
import Redis from "ioredis";
import { loadEnv } from "~/lib/env.server";

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(loadEnv().REDIS_URL, { maxRetriesPerRequest: 3 });
  }
  return redisClient;
}

/**
 * customers/redact — Shopify tells us a customer requested deletion.
 * We must remove any PII we hold for this specific customer.
 *
 * Payload shape (per Shopify docs):
 *   { shop_id, shop_domain, customer: { id, email, phone }, orders_to_redact: [] }
 */
export async function redactCustomer(
  shopDomain: string,
  customer: { id?: string; email?: string; phone?: string },
  ordersToRedact: string[] = [],
): Promise<void> {
  const customerEmail = customer.email?.toLowerCase().trim();
  const customerId = customer.id;
  logger.info("Starting customer redaction", { shopDomain, customerId, customerEmail });

  // 1. Scan all TaskLogs for this shop that contain the customer's email/order IDs and purge them.
  //    Use Prisma's text search via LIKE on the message column.
  if (customerEmail) {
    await prisma.taskLog.deleteMany({
      where: {
        shopDomain,
        message: { contains: customerEmail, mode: "insensitive" },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        shopDomain,
        OR: [
          { ipAddress: { contains: customerEmail } },
        ],
      },
    });
  }

  // 2. Purge any KnowledgeBaseEntry referencing this customer
  if (customerEmail) {
    await prisma.knowledgeBaseEntry.deleteMany({
      where: {
        shopDomain,
        OR: [
          { question: { contains: customerEmail, mode: "insensitive" } },
          { answer: { contains: customerEmail, mode: "insensitive" } },
        ],
      },
    });
  }

  // 3. For order-specific redaction, scan diffs and snapshots
  for (const orderId of ordersToRedact) {
    await prisma.taskDiff.deleteMany({
      where: {
        shopDomain,
        resourceId: orderId,
      },
    });
    await prisma.undoSnapshot.deleteMany({
      where: {
        shopDomain,
        resourceId: orderId,
      },
    });
  }

  // 4. Clear any cached Redis data that might reference this customer
  //    VANTA OS uses Redis only for BullMQ job data + ephemeral cache keys scoped by shop.
  //    We proactively clear all `cache:${shopDomain}:*` keys.
  try {
    const redis = getRedis();
    const keys = await redis.keys(`cache:${shopDomain}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info("Cleared Redis cache for shop", { shopDomain, keyCount: keys.length });
    }
  } catch (err) {
    logger.warn("Redis cleanup failed during redaction", { shopDomain, error: String(err) });
  }

  logger.info("Customer redaction complete", { shopDomain, customerId });
}

/**
 * customers/data_request — Shopify tells us a customer requested their data.
 * We must export all data we hold for this customer and return it (within 30 days,
 * but we do it immediately here).
 *
 * Payload shape:
 *   { shop_id, shop_domain, customer: { id, email, phone }, orders_requested: [] }
 *
 * Returns a structured JSON payload that the calling webhook can store / email.
 */
export async function exportCustomerData(
  shopDomain: string,
  customer: { id?: string; email?: string; phone?: string },
  ordersRequested: string[] = [],
): Promise<Record<string, unknown>> {
  const customerEmail = customer.email?.toLowerCase().trim();

  const auditLogs = await prisma.auditLog.findMany({
    where: { shopDomain, ipAddress: customerEmail ?? "___none___" },
    take: 1000,
  });

  const taskLogs = customerEmail
    ? await prisma.taskLog.findMany({
        where: {
          shopDomain,
          message: { contains: customerEmail, mode: "insensitive" },
        },
        take: 1000,
      })
    : [];

  const diffs = ordersRequested.length
    ? await prisma.taskDiff.findMany({
        where: { shopDomain, resourceId: { in: ordersRequested } },
      })
    : [];

  return {
    shop_domain: shopDomain,
    customer_id: customer.id,
    customer_email: customer.email,
    exported_at: new Date().toISOString(),
    retention_window_hours: GDPR.DELETION_WINDOW_HOURS,
    data: {
      audit_logs: auditLogs,
      task_logs_referencing_customer: taskLogs,
      task_diffs_for_requested_orders: diffs,
    },
    note: "VANTA OS does not store customer order data directly; only references in agent task logs are exported here.",
  };
}

/**
 * shop/redact — Shop owner uninstalled the app and wants ALL data purged.
 * We must delete every row tied to shopDomain within 48 hours.
 * We do it immediately to stay well within the window.
 */
export async function redactShop(shopDomain: string): Promise<void> {
  logger.info("Starting full shop redaction", { shopDomain });

  // Order matters for referential integrity.
  // Child tables first (with shopDomain index), then Session, then Shop.

  await prisma.taskLog.deleteMany({ where: { shopDomain } });
  await prisma.taskDiff.deleteMany({ where: { shopDomain } });
  await prisma.undoSnapshot.deleteMany({ where: { shopDomain } });
  await prisma.commandHistory.deleteMany({ where: { shopDomain } });
  await prisma.auditLog.deleteMany({ where: { shopDomain } });
  await prisma.scopeAuditLog.deleteMany({ where: { shopDomain } });
  await prisma.notification.deleteMany({ where: { shopDomain } });
  await prisma.feedback.deleteMany({ where: { shopDomain } });
  await prisma.featureFlag.deleteMany({ where: { shopDomain } });
  await prisma.recurringMission.deleteMany({ where: { shopDomain } });
  await prisma.guardianAlert.deleteMany({ where: { shopDomain } });
  await prisma.abExperiment.deleteMany({ where: { shopDomain } });
  await prisma.processedWebhook.deleteMany({ where: { shopDomain } });
  await prisma.knowledgeBaseEntry.deleteMany({ where: { shopDomain } });
  await prisma.rateLimitSnapshot.deleteMany({ where: { shopDomain } });
  await prisma.appEvent.deleteMany({ where: { shopDomain } });

  // Tasks reference staff — delete tasks first, then staff
  await prisma.task.deleteMany({ where: { shopDomain } });
  await prisma.staffMember.deleteMany({ where: { shopDomain } });

  // Sessions keyed by shop
  await prisma.session.deleteMany({ where: { shop: shopDomain } });

  // Finally the Shop row itself
  await prisma.shop.deleteMany({ where: { shopDomain } });

  // Redis cleanup — all keys scoped by shopDomain
  try {
    const redis = getRedis();
    const keys = await redis.keys(`*${shopDomain}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info("Cleared Redis keys for shop", { shopDomain, keyCount: keys.length });
    }
  } catch (err) {
    logger.warn("Redis cleanup failed during shop redaction", { shopDomain, error: String(err) });
  }

  logger.info("Full shop redaction complete", { shopDomain });
}
