// =============================================================================
// VANTA OS — Authenticated admin helper (Section 5.1)
// Wraps shopify.authenticate.admin() with multi-tenant safety: always returns
// the resolved shopDomain + Shop row so downstream callers never forget to scope.
// =============================================================================

import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import type { AdminApiContextWithRest, Session } from "@shopify/shopify-app-remix/server";
import { shopify } from "~/lib/shopify/auth.server";
import { prisma } from "~/lib/db.server";
import { extractStaffFromSession, upsertStaffMember } from "~/lib/shopify/staff";
import { getShopOrThrow } from "~/lib/shopify/multi-tenant";
import { logger } from "~/lib/logger.server";

export interface AuthenticatedContext {
  admin: AdminApiContextWithRest;
  session: Session;
  shopDomain: string;
  shop: Awaited<ReturnType<typeof getShopOrThrow>>;
  staffId: string;
}

/**
 * Authenticate an admin request and return the resolved multi-tenant context.
 * Use in loaders/actions that touch shop data:
 *
 *   export const loader = async ({ request }: LoaderFunctionArgs) => {
 *     const ctx = await requireAdmin(request);
 *     return json({ tasks: await prisma.task.findMany({ where: shopScoped(ctx.shopDomain) }) });
 *   };
 */
export async function requireAdmin(request: Request): Promise<AuthenticatedContext> {
  const { admin, session } = await shopify.authenticate.admin(request);
  const shopDomain = session.shop.replace(/^https?:\/\//, "");

  const shop = await getShopOrThrow(shopDomain);

  // Resolve staff member for audit trail (Section 32)
  const identity = extractStaffFromSession(session);
  const staffId = await upsertStaffMember(shop.id, shopDomain, identity);

  logger.debug("Admin authenticated", { shopDomain, staffId });

  return { admin, session, shopDomain, shop, staffId };
}

/**
 * Variant for action functions.
 */
export async function requireAdminAction(args: ActionFunctionArgs): Promise<AuthenticatedContext> {
  return requireAdmin(args.request);
}

/**
 * Variant for loader functions.
 */
export async function requireAdminLoader(
  args: LoaderFunctionArgs,
): Promise<AuthenticatedContext> {
  return requireAdmin(args.request);
}
