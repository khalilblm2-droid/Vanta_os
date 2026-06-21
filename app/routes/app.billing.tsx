// =============================================================================
// VANTA OS — Billing & Plans (Section 9.7, Section 5.3, Section 53)
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { CreditCard, TrendingUp, ExternalLink } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getActiveSubscription } from "~/lib/billing/app-events";
import { getSecurityHeaders } from "~/lib/security/headers";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { formatCredits, formatDateTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const sub = await getActiveSubscription(ctx.shopDomain);
  const recentEvents = await prisma.appEvent.findMany({
    where: { shopDomain: ctx.shopDomain },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return json({
    locale: ctx.shop.preferredLanguage as Locale,
    subscription: sub,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventName: e.eventName,
      credits: e.credits,
      createdAt: e.createdAt.toISOString(),
      taskId: e.taskId,
    })),
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function Billing() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const sub = data.subscription;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          {t("billing.title")}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="vanta-card p-5">
          <p className="text-xs text-vanta-muted uppercase tracking-wide mb-1">{t("billing.currentPlan")}</p>
          <p className="text-2xl font-bold">
            {sub ? t(`billing.plans.${sub.plan}`) : "—"}
          </p>
          <p className="text-xs text-vanta-muted mt-1">Status: {sub?.status ?? "—"}</p>
        </div>
        <div className="vanta-card p-5">
          <p className="text-xs text-vanta-muted uppercase tracking-wide mb-1">{t("billing.creditsRemaining")}</p>
          <p className="text-2xl font-bold">{formatCredits(sub?.creditsRemaining ?? 0)}</p>
          <p className="text-xs text-vanta-muted mt-1">
            {t("billing.creditsUsed")}: {formatCredits(sub?.creditsUsedCycle ?? 0)}
          </p>
        </div>
      </div>

      {sub?.cycleResetAt && (
        <p className="text-xs text-vanta-muted">
          {t("billing.cycleResets", { date: formatDateTime(sub.cycleResetAt, data.locale) })}
        </p>
      )}

      <a
        href={`https://${data.subscription ? "admin.shopify.com" : ""}/charges`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 transition"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {t("billing.manage")}
      </a>

      {/* Usage history */}
      <div className="vanta-card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-vanta-muted" />
          Recent credit usage
        </h2>
        {data.recentEvents.length === 0 ? (
          <p className="text-sm text-vanta-muted">No usage yet this cycle.</p>
        ) : (
          <ul className="divide-y divide-vanta-border">
            {data.recentEvents.map((e) => (
              <li key={e.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">{e.eventName}</p>
                  {e.taskId && (
                    <a href={`/app/history/${e.taskId}`} className="text-xs text-vanta-muted hover:underline">
                      View task
                    </a>
                  )}
                </div>
                <span className="text-xs text-vanta-muted">{formatDateTime(e.createdAt, data.locale)}</span>
                <span className="text-sm font-medium">{e.credits}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
