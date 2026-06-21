// =============================================================================
// VANTA OS — /api/command-history (Section 50)
// GET  → last 20 commands per shop
// POST → push a new command
// =============================================================================

import type { ActionFunctionArgs, LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { rateLimitCommandHistory } from "~/lib/security/rate-limit";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

const PostSchema = z.object({
  command: z.string().trim().min(1).max(2000),
});

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 20);

  const items = await prisma.commandHistory.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { command: true },
  });

  return json({ commands: items.map((i) => i.command) });
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);

  const rl = await rateLimitCommandHistory(ctx.shopDomain);
  if (!rl.allowed) {
    return json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await args.request.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "validation_failed" }, { status: 400 });
  }

  // Keep only the most recent 20 per shop — prune older entries
  await prisma.commandHistory.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      command: parsed.data.command,
    },
  });

  // Prune
  const all = await prisma.commandHistory.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true },
  });
  if (all.length > 20) {
    const toDelete = all.slice(20).map((r) => r.id);
    await prisma.commandHistory.deleteMany({ where: { id: { in: toDelete } } });
  }

  return json({ ok: true });
}
