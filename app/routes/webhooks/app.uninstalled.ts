// =============================================================================
// VANTA OS — Webhook: app/uninstalled (Section 5.2)
// Shopify sends this when the merchant uninstalls the app.
// We mark the shop as uninstalled but DO NOT delete data — that happens only
// on the shop/redact webhook. We revoke the session and enqueue cleanup.
// =============================================================================

import type { ActionFunctionArgs } from "@remix-run/node";
import { handleWebhook } from "~/lib/shopify/webhooks.server";
import { validate, AppUninstalledPayloadSchema } from "~/lib/validation/schemas";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleWebhook(request, async (payload, headers) => {
    const validated = validate(AppUninstalledPayloadSchema, payload);
    logger.info("app/uninstalled webhook received", { shopDomain: validated.shop_domain });

    await prisma.shop.update({
      where: { shopDomain: validated.shop_domain },
      data: {
        installed: false,
        uninstalledAt: new Date(),
        killSwitchEnabled: true, // Halt all in-flight tasks immediately
        killSwitchReason: "App uninstalled by merchant",
      },
    });

    // Delete all active sessions for this shop — tokens are now invalid
    await prisma.session.deleteMany({ where: { shop: validated.shop_domain } });

    // Cancel all pending recurring missions (Section 33)
    await prisma.recurringMission.updateMany({
      where: { shopDomain: validated.shop_domain, enabled: true },
      data: { enabled: false },
    });

    // Mark all in-flight tasks as CANCELLED (worker will check kill switch and abort)
    await prisma.task.updateMany({
      where: {
        shopDomain: validated.shop_domain,
        status: { in: ["QUEUED", "THINKING", "EXECUTING", "AWAITING_APPROVAL"] },
      },
      data: { status: "CANCELLED" },
    });

    logger.info("Shop uninstalled — sessions revoked, recurring missions disabled", {
      shopDomain: validated.shop_domain,
    });
  });
};
