// =============================================================================
// VANTA OS — /api/settings (Section 9.5) — GET + PATCH
// =============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, UpdateSettingsSchema } from "~/lib/validation/schemas";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const shop = ctx.shop;
  return json({
    preferredLanguage: shop.preferredLanguage,
    agentPersona: shop.agentPersona,
    canWriteProducts: shop.canWriteProducts,
    canWriteCollections: shop.canWriteCollections,
    canWriteInventory: shop.canWriteInventory,
    canWriteMetafields: shop.canWriteMetafields,
    canWriteThemes: shop.canWriteThemes,
    canReadOrders: shop.canReadOrders,
    canReadCustomers: shop.canReadCustomers,
    requiresApprovalOnBulk: shop.requiresApprovalOnBulk,
    bulkThreshold: shop.bulkThreshold,
    notifyOnTaskComplete: shop.notifyOnTaskComplete,
    notifyOnGuardianAlert: shop.notifyOnGuardianAlert,
    notifyOnError: shop.notifyOnError,
    emailNotifications: shop.emailNotifications,
    guardianModeEnabled: shop.guardianModeEnabled,
    guardianIntervalHours: shop.guardianIntervalHours,
    killSwitchEnabled: shop.killSwitchEnabled,
    killSwitchReason: shop.killSwitchReason,
    completedOnboarding: shop.completedOnboarding,
  });
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const update = validate(UpdateSettingsSchema, body);
  await prisma.shop.update({
    where: { id: ctx.shop.id },
    data: update,
  });
  return json({ ok: true });
}
