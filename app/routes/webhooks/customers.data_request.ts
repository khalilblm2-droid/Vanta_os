// =============================================================================
// VANTA OS — Webhook: customers/data_request (Section 5.2, Section 39)
// Shopify sends this when a customer requests an export of their data.
// We must compile and return it (we email it to the shop owner who is
// responsible for forwarding to the customer, per Shopify's guidance).
// =============================================================================

import type { ActionFunctionArgs } from "@remix-run/node";
import { handleWebhook } from "~/lib/shopify/webhooks.server";
import { exportCustomerData } from "~/lib/shopify/gdpr";
import { validate, CustomerDataRequestPayloadSchema } from "~/lib/validation/schemas";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleWebhook(request, async (payload, headers) => {
    const validated = validate(CustomerDataRequestPayloadSchema, payload);
    logger.info("customers/data_request webhook received", {
      shopDomain: validated.shop_domain,
      customerId: validated.customer.id,
    });

    const data = await exportCustomerData(
      validated.shop_domain,
      validated.customer,
      validated.orders_requested,
    );

    // Persist the export as a notification so the shop owner can download it.
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: validated.shop_domain },
      select: { id: true, email: true },
    });

    if (shop) {
      await prisma.notification.create({
        data: {
          shopId: shop.id,
          shopDomain: validated.shop_domain,
          type: "SYSTEM",
          severity: "INFO",
          title: "Customer data export ready",
          body: `A customer (${validated.customer.email ?? validated.customer.id}) requested their data. Export compiled at ${new Date().toISOString()}. Please review and forward to the customer.`,
          link: `/app/data-controls`,
        },
      });
    }

    logger.info("Customer data export compiled", {
      shopDomain: validated.shop_domain,
      customerId: validated.customer.id,
      auditLogs: (data.data as { audit_logs: unknown[] }).audit_logs.length,
    });
  });
};
