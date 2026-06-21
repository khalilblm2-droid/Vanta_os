// =============================================================================
// VANTA OS — Notification helper (Section 78)
// Persistent in-app notification center. Every agent action triggers one.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";

export interface CreateNotificationInput {
  type:
    | "TASK_QUEUED"
    | "TASK_COMPLETED"
    | "TASK_FAILED"
    | "TASK_REVERTED"
    | "GUARDIAN_ALERT"
    | "BILLING_EVENT"
    | "SYSTEM";
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(
  shopDomain: string,
  input: CreateNotificationInput,
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: { id: true },
  });
  if (!shop) {
    logger.warn("Cannot create notification — shop not found", { shopDomain });
    return;
  }
  await prisma.notification.create({
    data: {
      shopId: shop.id,
      shopDomain,
      type: input.type,
      severity: input.severity,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}
