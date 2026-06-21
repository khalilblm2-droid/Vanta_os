// =============================================================================
// VANTA OS — Guardian Alerts Dashboard (Section 34)
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { enqueueTask } from "~/lib/queue/task-queue";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const alerts = await prisma.guardianAlert.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({
    locale: ctx.shop.preferredLanguage as Locale,
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      resolved: a.resolved,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const { alertId, action } = body;

  const alert = await prisma.guardianAlert.findFirst({
    where: { id: alertId, ...shopScoped(ctx.shopDomain) },
  });
  if (!alert) return json({ ok: false }, { status: 404 });

  if (action === "resolve") {
    await prisma.guardianAlert.update({
      where: { id: alert.id },
      data: { resolved: true, resolvedAt: new Date() },
    });
    return json({ ok: true });
  }

  if (action === "fix") {
    // Auto-fix: enqueue a task that asks the agent to fix the issue
    const fixPrompt = `Guardian alert "${alert.title}" detected. Description: ${alert.description}. Investigate and propose a fix.`;
    const task = await prisma.task.create({
      data: {
        shopId: ctx.shop.id,
        shopDomain: ctx.shopDomain,
        staffId: ctx.staffId,
        command: fixPrompt,
        language: ctx.shop.preferredLanguage,
        persona: ctx.shop.agentPersona,
        status: "QUEUED",
        priority: "HIGH",
        estimatedCredits: 2,
      },
    });
    await enqueueTask(
      { taskId: task.id, shopDomain: ctx.shopDomain, enqueuedAt: new Date().toISOString() },
      "HIGH",
    );
    return json({ ok: true, taskId: task.id });
  }

  return json({ ok: false }, { status: 400 });
}

export default function Guardian() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { t } = useTranslation(data.locale);

  const activeAlerts = data.alerts.filter((a) => !a.resolved);
  const resolvedAlerts = data.alerts.filter((a) => a.resolved);

  const handleFix = (alertId: string) => {
    fetcher.submit({ alertId, action: "fix" }, { method: "post", encType: "application/json" });
  };
  const handleResolve = (alertId: string) => {
    fetcher.submit({ alertId, action: "resolve" }, { method: "post", encType: "application/json" });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          {t("guardian.title")}
        </h1>
        <p className="text-sm text-vanta-muted mt-1">{t("guardian.subtitle")}</p>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="vanta-card p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm">{t("guardian.noAlerts")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`vanta-card p-4 ${
                alert.severity === "critical"
                  ? "border-rose-300 dark:border-rose-700"
                  : "border-amber-300 dark:border-amber-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle
                      className={`h-4 w-4 ${
                        alert.severity === "critical" ? "text-rose-500" : "text-amber-500"
                      }`}
                    />
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-vanta-muted">
                      {t(`guardian.types.${alert.type}`)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm">{alert.title}</p>
                  <p className="text-xs text-vanta-muted mt-1">{alert.description}</p>
                  <p className="text-[10px] text-vanta-muted mt-2">
                    {formatRelativeTime(alert.createdAt, data.locale)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFix(alert.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition"
                >
                  {t("guardian.fixNow")}
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(alert.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition"
                >
                  {t("guardian.resolve")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <details className="vanta-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Resolved alerts ({resolvedAlerts.length})
          </summary>
          <ul className="mt-3 space-y-2 opacity-60">
            {resolvedAlerts.map((alert) => (
              <li key={alert.id} className="text-xs">
                <span className="font-medium">{alert.title}</span>
                <span className="ml-2 text-vanta-muted">
                  · {formatRelativeTime(alert.createdAt, data.locale)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
