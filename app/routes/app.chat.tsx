// =============================================================================
// VANTA OS — Future Chat Route
// The most advanced AI conversation interface — surpasses Replit, Manus.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { FutureChat } from "~/components/FutureChat";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import type { Locale } from "~/lib/i18n/useTranslation";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage as Locale,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function FutureChatRoute() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="h-[calc(100vh-160px)] sm:h-[calc(100vh-140px)]">
      <FutureChat locale={data.locale} shopDomain={data.shopDomain} />
    </div>
  );
}
