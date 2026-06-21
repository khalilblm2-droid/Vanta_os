// =============================================================================
// VANTA OS — Shopify Auth (Section 5.1)
// Uses @shopify/shopify-app-remix — NO hand-rolled token exchange.
// - App Bridge script in <head> before any other script
// - Session token auth only (Chrome incognito-safe, no cookie/localStorage deps)
// - Only the scopes actually used (per shopify.app.toml)
// - Encrypted session storage via @shopify/shopify-app-session-storage-prisma
// =============================================================================

import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  ShopifyApp,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { LATEST_API_VERSION } from "@shopify/shopify-api";
import { prisma } from "~/lib/db.server";
import { loadEnv } from "~/lib/env.server";
import { logger } from "~/lib/logger.server";

const e = loadEnv();

// Section 80 — log the API version being used
logger.info("Shopify API version", {
  configured: e.SHOPIFY_API_VERSION,
  libraryLatest: LATEST_API_VERSION,
});

const sessionStorage = new PrismaSessionStorage(prisma);

export const shopify: ShopifyApp = shopifyApp({
  apiKey: e.SHOPIFY_API_KEY,
  apiSecretKey: e.SHOPIFY_API_SECRET,
  apiVersion: e.SHOPIFY_API_VERSION,
  scopes: e.SHOPIFY_APP_SCOPES.split(",").map((s) => s.trim()),
  appUrl: e.SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage,
  // AppDistribution.AppStore causes different auth behavior that
  // can result in blank screen for custom apps.
  distribution: AppDistribution.Custom,
  isEmbeddedApp: true,
  hooks: {
    // After OAuth completes — register shop in our DB (Section 44 multi-tenant)
    afterAuth: async ({ session, admin }) => {
      try {
        const shopDomain = session.shop.replace(/^https?:\/\//, "");

        // Upsert Shop row (Section 44)
        const shop = await prisma.shop.upsert({
          where: { shopDomain },
          update: {
            installed: true,
            uninstalledAt: null,
            scopes: session.scope,
            updatedAt: new Date(),
          },
          create: {
            shopDomain,
            scopes: session.scope,
            installed: true,
            installedAt: new Date(),
            plan: "PRIVATE_TEST", // Section 5.3 — always-available $0 dev plan
            creditsRemaining: 100,
            preferredLanguage: "en",
            defaultLocale: "en",
          },
        });

        // Pull shop metadata (timezone, currency, markets — Sections 73, 84)
        try {
          const resp = await admin.graphql(
            `#graphql
              query GetShopMeta {
                shop {
                  id
                  name
                  email
                  ianaTimezone
                  primaryDomain { url }
                  currencyCode
                  billingAddress { countryCode }
                }
              }`,
          );
          const data = (await resp.json()) as {
            data?: { shop?: Record<string, unknown> };
          };
          const s = data?.data?.shop;
          if (s) {
            await prisma.shop.update({
              where: { id: shop.id },
              data: {
                name: (s.name as string) ?? null,
                email: (s.email as string) ?? null,
                ianaTimezone: (s.ianaTimezone as string) ?? null,
                countryCode:
                  (s.billingAddress as { countryCode?: string } | null)?.countryCode ?? null,
                primaryCurrency: (s.currencyCode as string) ?? "USD",
              },
            });
          }
        } catch (metaErr) {
          logger.warn("Shop metadata fetch failed", {
            shopDomain,
            error: String(metaErr),
          });
        }

        logger.info("Shop authenticated", { shopDomain });
      } catch (err) {
        logger.error("afterAuth hook failed", {
          shop: session.shop,
          error: String(err),
        });
      }
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  // calls to fail silently, which broke some Polaris components that
  // rely on REST endpoints internally.
  ...(process.env.NODE_ENV !== "production" ? { dev: true } : {}),
});

// Re-export the sessionStorage so webhook routes can resolve sessions
export { sessionStorage };

// Distribution helper used by routes
export const isEmbeddedApp = true;
