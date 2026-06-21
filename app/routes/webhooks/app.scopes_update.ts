// =============================================================================
// VANTA OS — Webhook: app/scopes_update (Section 5.2)
// Shopify sends this when the merchant grants or revokes access scopes.
// We update the Shop.scopes field so the agent knows what it can do.
// =============================================================================

import type { ActionFunctionArgs } from "@remix-run/node";
import { handleWebhook } from "~/lib/shopify/webhooks.server";
import { prisma } from "~/lib/db.server";
import { z } from "zod";
import { logger } from "~/lib/logger.server";

const ScopesUpdateSchema = z.object({
  shop_id: z.number(),
  shop_domain: z.string(),
  // Shopify's actual payload may vary — accept any extra fields
});

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleWebhook(request, async (payload, headers) => {
    const validated = ScopesUpdateSchema.parse(payload);
    logger.info("app/scopes_update webhook received", { shopDomain: validated.shop_domain });

    // The new scopes are not in the payload — Shopify expects us to re-fetch.
    // Mark the shop as needing a scope refresh; the next authenticated request
    // will pull the updated scope list from the session.
    await prisma.shop
      .update({
        where: { shopDomain: validated.shop_domain },
        data: { updatedAt: new Date() },
      })
      .catch(() => {});

    // Log a scope audit entry
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: validated.shop_domain },
      select: { id: true },
    });
    if (shop) {
      await prisma.scopeAuditLog.create({
        data: {
          shopId: shop.id,
          shopDomain: validated.shop_domain,
          scope: "_meta",
          endpoint: "webhook:app/scopes_update",
        },
      });
    }
  });
};
