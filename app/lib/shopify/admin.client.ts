// =============================================================================
// VANTA OS — Shopify Admin GraphQL Client (Section 19, Section 71)
// - Exponential backoff with jitter on 429/5xx
// - Monitors extensions.cost.throttleStatus — pauses before hitting the limit
// - Auto-switches to Bulk Operations API above 250 records (caller-driven)
// - Persists RateLimitSnapshot per shop (Section 53)
// - Logs ScopeAuditLog for each scope exercised (Section 62)
// =============================================================================

import type { AdminApiContextWithRest } from "@shopify/shopify-app-remix/server";
import { logger } from "~/lib/logger.server";
import { prisma } from "~/lib/db.server";
import {
  RATE_LIMIT,
  BULK_OPERATION_THRESHOLD,
  SHOPIFY_API_VERSION,
} from "~/lib/shopify/constants";

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export interface GraphQLRequestOptions {
  shopDomain: string;
  taskId?: string;
  /** For audit log purposes — which scope this call exercises (Section 62) */
  scopeUsed?: string;
  /** Endpoint marker for audit */
  operation?: string;
  /** Force-retry attempts override */
  maxRetries?: number;
  /** Abort if kill switch engaged — handled by caller but logged here */
  signal?: AbortSignal;
}

/**
 * Section 19 — pause execution if available cost drops below threshold.
 * Sleeps until enough budget is restored, then returns.
 */
async function waitForBudget(throttleStatus: {
  maximumAvailable: number;
  currentlyAvailable: number;
  restoreRate: number;
}): Promise<void> {
  const minimum = Math.max(
    1,
    Math.floor(throttleStatus.maximumAvailable * RATE_LIMIT.PAUSE_THRESHOLD_RATIO),
  );

  if (throttleStatus.currentlyAvailable >= minimum) return;

  const deficit = minimum - throttleStatus.currentlyAvailable;
  // restoreRate is "credits per second"
  const waitMs = Math.ceil((deficit / Math.max(throttleStatus.restoreRate, 0.1)) * 1000);

  logger.warn("Pausing for Shopify rate budget", {
    currentlyAvailable: throttleStatus.currentlyAvailable,
    minimum,
    waitMs,
  });

  await new Promise((r) => setTimeout(r, Math.min(waitMs, 10_000)));
}

/**
 * Execute a Shopify Admin GraphQL request with full cost-limit resilience.
 *
 * Usage from a Remix loader/action:
 *   const admin = await shopify.authenticate.admin(request);
 *   const result = await adminGraphQL<{ products: ... }>(admin, query, vars, opts);
 */
export async function adminGraphQL<T = unknown>(
  admin: AdminApiContextWithRest,
  query: string,
  variables: Record<string, unknown> = {},
  opts: GraphQLRequestOptions,
): Promise<GraphQLResponse<T>> {
  const maxRetries = opts.maxRetries ?? RATE_LIMIT.RETRY_MAX;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      const resp = await admin.graphql(query, { variables });

      if (resp.status === 429) {
        // Shopify returned throttle — exponential backoff
        const backoff = RATE_LIMIT.BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 200);
        logger.warn("Shopify 429 throttle", {
          shopDomain: opts.shopDomain,
          attempt,
          backoffMs: backoff + jitter,
        });
        if (attempt > maxRetries) {
          throw new Error(`Shopify rate limit exhausted after ${maxRetries} retries`);
        }
        await new Promise((r) => setTimeout(r, backoff + jitter));
        continue;
      }

      if (resp.status >= 500) {
        const backoff = RATE_LIMIT.BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        logger.warn("Shopify 5xx", {
          shopDomain: opts.shopDomain,
          status: resp.status,
          attempt,
          backoffMs: backoff,
        });
        if (attempt > maxRetries) throw new Error(`Shopify ${resp.status} after retries`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      const body = (await resp.json()) as GraphQLResponse<T>;

      // Persist rate-limit snapshot (Section 53)
      if (body.extensions?.cost?.throttleStatus) {
        const ts = body.extensions.cost.throttleStatus;
        await prisma.rateLimitSnapshot
          .create({
            data: {
              shopDomain: opts.shopDomain,
              throttleStatus: ts as unknown as object,
              currentlyAvailable: ts.currentlyAvailable,
              restoreRate: ts.restoreRate,
              requestedQueryCost: body.extensions.cost.requestedQueryCost,
              actualQueryCost: body.extensions.cost.actualQueryCost,
            },
          })
          .catch(() => {}); // never throw on observability failure

        // Section 19 — pause proactively if close to limit
        await waitForBudget(ts);
      }

      // Scope audit log (Section 62)
      if (opts.scopeUsed) {
        await prisma.scopeAuditLog
          .create({
            data: {
              shopDomain: opts.shopDomain,
              scope: opts.scopeUsed,
              taskId: opts.taskId,
              endpoint: opts.operation ?? "graphql",
            },
          })
          .catch(() => {});
      }

      // Surface GraphQL errors as thrown — caller handles
      if (body.errors && body.errors.length > 0) {
        const first = body.errors[0];
        const msg = first.message;
        logger.warn("Shopify GraphQL error", {
          shopDomain: opts.shopDomain,
          message: msg,
          attempt,
        });
        // Validation errors are non-retryable; throw to caller
        throw new GraphQLError(msg, first.extensions);
      }

      return body;
    } catch (err) {
      if (err instanceof GraphQLError) throw err;
      if (attempt > maxRetries) {
        logger.error("Shopify GraphQL failed (max retries)", {
          shopDomain: opts.shopDomain,
          error: String(err),
        });
        throw err;
      }
      const backoff = RATE_LIMIT.BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      logger.warn("Shopify GraphQL retry", {
        shopDomain: opts.shopDomain,
        attempt,
        backoffMs: backoff,
        error: String(err),
      });
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

/** Custom error that preserves Shopify's extensions metadata. */
export class GraphQLError extends Error {
  extensions?: Record<string, unknown>;
  constructor(message: string, extensions?: Record<string, unknown>) {
    super(message);
    this.name = "ShopifyGraphQLError";
    this.extensions = extensions;
  }
}

/**
 * Section 71 — decide whether to use Bulk Operations API.
 * Returns true if the expected record count exceeds the threshold.
 */
export function shouldUseBulkOperations(recordCount: number): boolean {
  return recordCount > BULK_OPERATION_THRESHOLD;
}

/** Helper to construct shop-scoped admin URL for deep links (Section 26). */
export function shopifyAdminUrl(shopDomain: string, path: string): string {
  const clean = shopDomain.replace(/^https?:\/\//, "");
  return `https://${clean}/admin/${path.replace(/^\//, "")}`;
}

/** Helper to construct shop-scoped admin deep-link for a specific resource (Section 26). */
export function shopifyResourceUrl(
  shopDomain: string,
  resource: "products" | "orders" | "customers" | "collections" | "inventory",
  id: string | number,
): string {
  return shopifyAdminUrl(shopDomain, `${resource}/${id}`);
}

/** Exported for unit tests. */
export const __test = { waitForBudget, SHOPIFY_API_VERSION };
