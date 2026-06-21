// =============================================================================
// VANTA OS — Recurring Automations (Section 33, Section 84)
// =============================================================================

import { useState } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs, type HeadersArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Plus, Trash2, Star } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, RecurringMissionSchema } from "~/lib/validation/schemas";
import { useToast } from "~/components/ui/Toaster";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { formatDateTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const missions = await prisma.recurringMission.findMany({
    where: shopScoped(ctx.shopDomain),
    orderBy: { createdAt: "desc" },
  });
  return json({
    locale: ctx.shop.preferredLanguage as Locale,
    timezone: ctx.shop.ianaTimezone ?? "UTC",
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

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
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

  // Trigger sync of recurring schedules on the worker
  return json({ ok: true, mission });
}

export default function Automations() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();
  const { t } = useTranslation(data.locale);
  const [showForm, setShowForm] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [cron, setCron] = useState("0 0 * * 5"); // Every Friday midnight

  const handleSubmit = () => {
    if (!prompt.trim() || !cron.trim()) return;
    fetcher.submit(
      { prompt, cron, timezone: data.timezone },
      { method: "post", encType: "application/json" },
    );
    toast.success(t("automations.save"));
    setShowForm(false);
    setPrompt("");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/recurring-missions/${id}`, { method: "DELETE" });
    window.location.reload();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6" />
            {t("automations.title")}
          </h1>
          <p className="text-sm text-vanta-muted mt-1">{t("automations.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 transition"
        >
          <Plus className="h-4 w-4" />
          {t("automations.new")}
        </button>
      </div>

      {showForm && (
        <div className="vanta-card p-5 space-y-3">
          <div>
            <label className="text-xs text-vanta-muted">{t("automations.promptLabel")}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
              placeholder="e.g. Find out-of-stock products and add a 'Restocking Soon' tag"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-vanta-muted">{t("automations.cronLabel")}</label>
              <input
                type="text"
                value={cron}
                onChange={(e) => setCron(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm font-mono outline-none focus:ring-2 focus:ring-vanta-500"
              />
            </div>
            <div>
              <label className="text-xs text-vanta-muted">{t("automations.tzLabel")}</label>
              <input
                type="text"
                value={data.timezone}
                readOnly
                className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm rounded-lg bg-vanta-100 dark:bg-vanta-800"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-3 py-1.5 text-sm rounded-lg bg-vanta-600 text-white hover:bg-vanta-700"
            >
              {t("automations.save")}
            </button>
          </div>
        </div>
      )}

      {data.missions.length === 0 ? (
        <div className="vanta-card p-10 text-center">
          <p className="text-sm text-vanta-muted">{t("automations.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.missions.map((m) => (
            <li key={m.id} className="vanta-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.prompt}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-vanta-muted">
                    <span className="font-mono">{m.cron}</span>
                    <span>·</span>
                    <span>{m.timezone}</span>
                    <span>·</span>
                    <span>{m.runCount} runs</span>
                    {m.lastRunAt && (
                      <>
                        <span>·</span>
                        <span>{t("automations.lastRun", { date: formatDateTime(m.lastRunAt, data.locale, m.timezone) })}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      m.enabled
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted"
                    }`}
                  >
                    {m.enabled ? t("automations.enabled") : t("automations.disabled")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
