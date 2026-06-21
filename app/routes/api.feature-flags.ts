// =============================================================================
// VANTA OS — /api/feature-flags (Section 70)
// GET  → list flags for shop
// POST → create/update a flag
// =============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, FeatureFlagToggleSchema } from "~/lib/validation/schemas";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const flags = await prisma.featureFlag.findMany({
    where: { shopDomain: ctx.shopDomain },
  });
  return json({
    flags: flags.map((f) => ({
      key: f.key,
      enabled: f.enabled,
      config: f.config,
      updatedAt: f.updatedAt.toISOString(),
    })),
  });
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(FeatureFlagToggleSchema, body);

  await prisma.featureFlag.upsert({
    where: {
      shopDomain_key: {
        shopDomain: ctx.shopDomain,
        key: input.key,
      },
    },
    update: { enabled: input.enabled },
    create: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      key: input.key,
      enabled: input.enabled,
    },
  });

  return json({ ok: true });
}
