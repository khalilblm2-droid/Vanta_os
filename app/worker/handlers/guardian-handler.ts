// =============================================================================
// VANTA OS — Guardian Mode (Section 34)
// Background "Guardian" checks run periodically (default every 6 hours).
// Detects: price=$0, inventory dipping below threshold, broken internal links.
// Creates GuardianAlerts + optional "Fix Now" actions.
// =============================================================================

import type { AdminApiContextWithRest } from "@shopify/shopify-app-remix/server";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { adminGraphQL } from "~/lib/shopify/admin.client";
import { createNotification } from "~/lib/notifications";
import { sendGuardianAlertEmail } from "~/lib/email/resend";
import type { GuardianJobPayload } from "~/lib/queue/task-queue";

const LOW_INVENTORY_THRESHOLD = 5;

export async function processGuardianJob(
  admin: AdminApiContextWithRest,
  payload: GuardianJobPayload,
): Promise<{ alertsCreated: number }> {
  const { shopDomain, checkType } = payload;
  logger.info("Guardian check starting", { shopDomain, checkType });

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
    select: {
      id: true,
      email: true,
      notifyOnGuardianAlert: true,
      emailNotifications: true,
      guardianModeEnabled: true,
    },
  });

  if (!shop || !shop.guardianModeEnabled) {
    logger.info("Guardian mode disabled — skipping", { shopDomain });
    return { alertsCreated: 0 };
  }

  let alertsCreated = 0;

  if (checkType === "PRICE_ZERO" || checkType === "FULL_SWEEP") {
    alertsCreated += await checkPriceZero(admin, shopDomain, shop.id);
  }
  if (checkType === "LOW_INVENTORY" || checkType === "FULL_SWEEP") {
    alertsCreated += await checkLowInventory(admin, shopDomain, shop.id);
  }
  if (checkType === "BROKEN_LINK" || checkType === "FULL_SWEEP") {
    alertsCreated += await checkBrokenLinks(admin, shopDomain, shop.id);
  }

  logger.info("Guardian check complete", { shopDomain, checkType, alertsCreated });

  if (alertsCreated > 0) {
    await createNotification(shopDomain, {
      type: "GUARDIAN_ALERT",
      severity: "WARNING",
      title: `${alertsCreated} new Guardian alert${alertsCreated === 1 ? "" : "s"}`,
      body: `VANTA OS Guardian detected ${alertsCreated} issue${alertsCreated === 1 ? "" : "s"} that need your attention.`,
      link: "/app/guardian",
    });

    if (
      shop.notifyOnGuardianAlert &&
      shop.emailNotifications &&
      shop.email
    ) {
      await sendGuardianAlertEmail({
        to: shop.email,
        shopDomain,
        alertTitle: `${alertsCreated} Guardian alert${alertsCreated === 1 ? "" : "s"}`,
        alertDescription:
          "VANTA OS proactively detected issues with your store. Visit the Guardian dashboard to review and apply fixes.",
        fixUrl: `https://${shopDomain}/admin/apps/${process.env.SHOPIFY_APP_HANDLE}/app/guardian`,
      });
    }
  }

  return { alertsCreated };
}

/** Section 34 — detect products accidentally priced at $0. */
async function checkPriceZero(
  admin: AdminApiContextWithRest,
  shopDomain: string,
  shopId: string,
): Promise<number> {
  const resp = await adminGraphQL<{
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          variants: { edges: Array<{ node: { id: string; price: string } }> };
        };
      }>;
    };
  }>(
    admin,
    `#graphql
      query ZeroPriceProducts {
        products(first: 100, query: "variants.price:0") {
          edges {
            node {
              id
              title
              variants(first: 5) {
                edges {
                  node { id price }
                }
              }
            }
          }
        }
      }`,
    {},
    { shopDomain, scopeUsed: "read_products", operation: "guardian:priceZero" },
  );

  const products = resp.data?.products.edges ?? [];
  let created = 0;

  for (const edge of products) {
    const zeroVariants = edge.node.variants.edges.filter((v) => Number(v.node.price) === 0);
    if (zeroVariants.length === 0) continue;

    // Check if an unresolved alert for this product already exists
    const existing = await prisma.guardianAlert.findFirst({
      where: {
        shopId,
        shopDomain,
        type: "PRICE_ZERO",
        resolved: false,
        payload: { path: ["resourceId"], equals: edge.node.id },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.guardianAlert.create({
      data: {
        shopId,
        shopDomain,
        type: "PRICE_ZERO",
        severity: "critical",
        title: `Product "${edge.node.title}" has a $0 price`,
        description: `${zeroVariants.length} variant(s) of "${edge.node.title}" are priced at $0. This may be an error.`,
        payload: {
          resourceId: edge.node.id,
          resourceTitle: edge.node.title,
          variantIds: zeroVariants.map((v) => v.node.id),
        },
      },
    });
    created++;
  }
  return created;
}

/** Section 34 — detect inventory dipping below threshold. */
async function checkLowInventory(
  admin: AdminApiContextWithRest,
  shopDomain: string,
  shopId: string,
): Promise<number> {
  const resp = await adminGraphQL<{
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          variants: {
            edges: Array<{ node: { id: string; sku: string; inventoryQuantity: number } }>;
          };
        };
      }>;
    };
  }>(
    admin,
    `#graphql
      query LowInventoryProducts {
        products(first: 100, query: "inventory_total:<=${LOW_INVENTORY_THRESHOLD}") {
          edges {
            node {
              id
              title
              variants(first: 10) {
                edges {
                  node { id sku inventoryQuantity }
                }
              }
            }
          }
        }
      }`,
    {},
    { shopDomain, scopeUsed: "read_inventory", operation: "guardian:lowInventory" },
  );

  const products = resp.data?.products.edges ?? [];
  let created = 0;

  for (const edge of products) {
    const lowVariants = edge.node.variants.edges.filter(
      (v) => v.node.inventoryQuantity <= LOW_INVENTORY_THRESHOLD,
    );
    if (lowVariants.length === 0) continue;

    const existing = await prisma.guardianAlert.findFirst({
      where: {
        shopId,
        shopDomain,
        type: "LOW_INVENTORY",
        resolved: false,
        payload: { path: ["resourceId"], equals: edge.node.id },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.guardianAlert.create({
      data: {
        shopId,
        shopDomain,
        type: "LOW_INVENTORY",
        severity: "warning",
        title: `"${edge.node.title}" is running low on inventory`,
        description: `${lowVariants.length} variant(s) of "${edge.node.title}" have ${LOW_INVENTORY_THRESHOLD} or fewer units in stock.`,
        payload: {
          resourceId: edge.node.id,
          resourceTitle: edge.node.title,
          variants: lowVariants.map((v) => ({
            id: v.node.id,
            sku: v.node.sku,
            inventoryQuantity: v.node.inventoryQuantity,
          })),
        },
      },
    });
    created++;
  }
  return created;
}

/** Section 34 — detect broken internal links in product descriptions. */
async function checkBrokenLinks(
  admin: AdminApiContextWithRest,
  shopDomain: string,
  shopId: string,
): Promise<number> {
  // Limited implementation: scan product descriptions for links that 404.
  // Full implementation would use the Bulk Operations API for large catalogs.
  const resp = await adminGraphQL<{
    products: {
      edges: Array<{
        node: { id: string; title: string; descriptionHtml: string };
      }>;
    };
  }>(
    admin,
    `#graphql
      query ProductsWithLinks {
        products(first: 50) {
          edges {
            node { id title descriptionHtml }
          }
        }
      }`,
    {},
    { shopDomain, scopeUsed: "read_products", operation: "guardian:brokenLinks" },
  );

  const products = resp.data?.products.edges ?? [];
  let created = 0;
  const linkRegex = /href=["']([^"']+)["']/g;

  for (const edge of products) {
    const html = edge.node.descriptionHtml ?? "";
    const matches = Array.from(html.matchAll(linkRegex));
    for (const m of matches) {
      const url = m[1];
      // Only check internal shopify links
      if (!url.includes(shopDomain) && !url.startsWith("/")) continue;
      const fullUrl = url.startsWith("/") ? `https://${shopDomain}${url}` : url;
      try {
        const r = await fetch(fullUrl, { method: "HEAD", redirect: "follow" });
        if (r.status >= 400) {
          const existing = await prisma.guardianAlert.findFirst({
            where: {
              shopId,
              shopDomain,
              type: "BROKEN_LINK",
              resolved: false,
              payload: { path: ["url"], equals: fullUrl },
            },
            select: { id: true },
          });
          if (existing) continue;
          await prisma.guardianAlert.create({
            data: {
              shopId,
              shopDomain,
              type: "BROKEN_LINK",
              severity: "info",
              title: `Broken link in "${edge.node.title}"`,
              description: `Product description contains a broken link: ${fullUrl} (HTTP ${r.status})`,
              payload: { url: fullUrl, productId: edge.node.id, productTitle: edge.node.title },
            },
          });
          created++;
        }
      } catch {
        // Skip unreachable URLs silently
      }
    }
  }
  return created;
}
