// =============================================================================
// VANTA OS — Webhook: customers/redact (Section 5.2, Section 39)
// Shopify sends this when a customer requests deletion of their data.
// We must permanently delete all PII within 48 hours. We do it immediately.
// =============================================================================

import type { ActionFunctionArgs } from "@remix-run/node";
import { handleWebhook } from "~/lib/shopify/webhooks.server";
import { redactCustomer } from "~/lib/shopify/gdpr";
import { validate, CustomerRedactPayloadSchema } from "~/lib/validation/schemas";
import { logger } from "~/lib/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleWebhook(request, async (payload, headers) => {
    const validated = validate(CustomerRedactPayloadSchema, payload);
    logger.info("customers/redact webhook received", {
      shopDomain: validated.shop_domain,
      customerId: validated.customer.id,
    });
    await redactCustomer(validated.shop_domain, validated.customer, validated.orders_to_redact);
  });
};
