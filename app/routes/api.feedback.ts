// =============================================================================
// VANTA OS — /api/feedback (Section 82)
// =============================================================================

import type { ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, FeedbackSchema } from "~/lib/validation/schemas";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "application/json" };
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const input = validate(FeedbackSchema, body);

  await prisma.feedback.create({
    data: {
      shopId: ctx.shop.id,
      shopDomain: ctx.shopDomain,
      staffId: ctx.staffId,
      rating: input.rating,
      message: input.message,
      screenshotUrl: input.screenshotUrl,
      page: input.page,
      userAgent: args.request.headers.get("user-agent") ?? null,
    },
  });

  return json({ ok: true }, { status: 201 });
}
