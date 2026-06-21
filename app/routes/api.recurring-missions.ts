// =============================================================================
// VANTA OS — /api/recurring-missions (Section 33)
// GET  → list missions for shop
// POST → create a mission
// =============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, RecurringMissionSchema } from "~/lib/validation/schemas";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const missions = await prisma.recurringMission.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
  });
  return json({
    missions: missions.map((m) => ({
      id: m.id,
      prompt: m.prompt,
      cron: m.cron,
      timezone: m.timezone,
      enabled: m.enabled,
      lastRunAt: m.lastRunAt?.toISOString() ?? null,
      nextRunAt: m.nextRunAt?.toISOString() ?? null,
      runCount: m.runCount,
    })),
  });
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(RecurringMissionSchema, body);

  const mission = await prisma.recurringMission.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      prompt: input.prompt,
      cron: input.cron,
      timezone: input.timezone || ctx.shop.ianaTimezone || "UTC",
      enabled: true,
    },
  });

  return json({ ok: true, mission }, { status: 201 });
}
