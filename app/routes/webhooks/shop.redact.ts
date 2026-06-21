// =============================================================================
// VANTA OS — Webhook: shop/redact (Section 5.2, Section 39)
// Shopify sends this when a shop owner uninstalls the app AND requests deletion.
// We must permanently delete ALL data tied to this shop within 48 hours.
// =============================================================================

import type { ActionFunctionArgs } from "@remix-run/node";
import { handleWebhook } from "~/lib/shopify/webhooks.server";
import { redactShop } from "~/lib/shopify/gdpr";
import { validate, ShopRedactPayloadSchema } from "~/lib/validation/schemas";
import { logger } from "~/lib/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleWebhook(request, async (payload, headers) => {
    const validated = validate(ShopRedactPayloadSchema, payload);
    logger.info("shop/redact webhook received", { shopDomain: validated.shop_domain });
    await redactShop(validated.shop_domain);
  });
};
