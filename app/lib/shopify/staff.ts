// =============================================================================
// VANTA OS — Staff Member resolver (Section 32)
// Multi-staff accountability: every task records which staff member initiated it.
// Staff identity is extracted from the Shopify session token payload.
// =============================================================================

import type { Session } from "@shopify/shopify-app-remix/server";
import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";

export interface StaffIdentity {
  shopifyStaffId: string;
  name?: string;
  email?: string;
  role?: string;
  isOwner?: boolean;
}

/**
 * Extract staff identity from the App Bridge session token payload.
 * The JWT payload contains `sub` (user id), `email`, and the shop's owner info
 * under the `account_number` / `user` claim depending on token version.
 */
export function extractStaffFromSession(session: Session): StaffIdentity {
  // The shopify-app-remix session doesn't always expose the decoded JWT,
  // but `session.onlineAccessInfo` holds it when available.
  let online: { associated_user?: { id: number; email?: string; first_name?: string; last_name?: string; account_owner?: boolean }; account_number?: string } | null = null;
  try {
    online = session.onlineAccessInfo ? JSON.parse(session.onlineAccessInfo) : null;
  } catch {
    online = null;
  }

  const user = online?.associated_user;
  const shopifyStaffId = user ? String(user.id) : online?.account_number ?? "unknown";

  return {
    shopifyStaffId,
    name: user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : undefined,
    email: user?.email,
    role: user?.account_owner ? "owner" : "staff",
    isOwner: Boolean(user?.account_owner),
  };
}

/**
 * Upsert a StaffMember row for the active session.
 * Returns the row id used to link Tasks and AuditLogs.
 */
export async function upsertStaffMember(
  shopId: string,
  shopDomain: string,
  identity: StaffIdentity,
): Promise<string> {
  const staff = await prisma.staffMember.upsert({
    where: {
      shopDomain_shopifyStaffId: {
        shopDomain,
        shopifyStaffId: identity.shopifyStaffId,
      },
    },
    update: {
      name: identity.name,
      email: identity.email,
      role: identity.role,
      isOwner: Boolean(identity.isOwner),
      lastSeenAt: new Date(),
    },
    create: {
      shopId,
      shopDomain,
      shopifyStaffId: identity.shopifyStaffId,
      name: identity.name,
      email: identity.email,
      role: identity.role,
      isOwner: Boolean(identity.isOwner),
    },
    select: { id: true },
  });

  logger.debug("Staff member resolved", {
    shopDomain,
    shopifyStaffId: identity.shopifyStaffId,
    staffId: staff.id,
  });

  return staff.id;
}
