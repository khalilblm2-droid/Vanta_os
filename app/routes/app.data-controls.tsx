// =============================================================================
// VANTA OS — Data & Account Controls (Section 9.10, Section 39)
// Self-service export/delete. Complements mandatory GDPR webhooks.
// =============================================================================

import { useState } from "react";
import { type LoaderFunctionArgs, type ActionFunctionArgs, type HeadersArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { Download, Trash2, Shield } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { redactShop, exportCustomerData } from "~/lib/shopify/gdpr";
import { getSecurityHeaders } from "~/lib/security/headers";
import { useToast } from "~/components/ui/Toaster";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);

  // Show what data we hold
  const counts = {
    tasks: await prisma.task.count({ where: { shopDomain: ctx.shopDomain } }),
    auditLogs: await prisma.auditLog.count({ where: { shopDomain: ctx.shopDomain } }),
    notifications: await prisma.notification.count({ where: { shopDomain: ctx.shopDomain } }),
    undoSnapshots: await prisma.undoSnapshot.count({ where: { shopDomain: ctx.shopDomain } }),
    commandHistory: await prisma.commandHistory.count({ where: { shopDomain: ctx.shopDomain } }),
    recurringMissions: await prisma.recurringMission.count({ where: { shopDomain: ctx.shopDomain } }),
    guardianAlerts: await prisma.guardianAlert.count({ where: { shopDomain: ctx.shopDomain } }),
    featureFlags: await prisma.featureFlag.count({ where: { shopDomain: ctx.shopDomain } }),
  };

  return json({
    shopDomain: ctx.shopDomain,
    locale: ctx.shop.preferredLanguage as Locale,
    counts,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  const body = await args.request.json();
  const action = body.action;

  if (action === "export") {
    // Compile structured JSON export
    const data = await exportCustomerData(ctx.shopDomain, {}, []);
    return json({ ok: true, export: data });
  }

  if (action === "delete") {
    // Full shop redaction — same as the shop/redact webhook
    await redactShop(ctx.shopDomain);
    return redirect("/auth/login");
  }

  return json({ ok: false, error: "Unknown action" }, { status: 400 });
}

export default function DataControls() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const toast = useToast();
  const { t } = useTranslation(data.locale);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleExport = () => {
    fetcher.submit(
      { action: "export" },
      { method: "post", encType: "application/json" },
    );
    toast.success(t("data.exportReady"));
  };

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (!confirm(t("data.deleteConfirm", { shop: data.shopDomain }))) return;
    fetcher.submit(
      { action: "delete" },
      { method: "post", encType: "application/json" },
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          {t("data.title")}
        </h1>
        <p className="text-sm text-vanta-muted mt-1">{t("data.subtitle")}</p>
      </div>

      {/* Data inventory */}
      <div className="vanta-card p-5">
        <h2 className="font-semibold mb-3">Data we hold for {data.shopDomain}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(data.counts).map(([key, count]) => (
            <div key={key} className="p-3 rounded-lg bg-vanta-50 dark:bg-vanta-900/40">
              <p className="text-xs text-vanta-muted uppercase tracking-wide">{key}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleExport}
          className="vanta-card p-5 hover:border-vanta-400 dark:hover:border-vanta-500 transition text-left flex items-start gap-3"
        >
          <Download className="h-5 w-5 text-vanta-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{t("data.export")}</p>
            <p className="text-xs text-vanta-muted mt-1">
              Download a structured JSON export of all data VANTA holds about your shop.
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={`vanta-card p-5 transition text-left flex items-start gap-3 ${
            confirmingDelete
              ? "border-rose-400 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/30"
              : "hover:border-rose-400 dark:hover:border-rose-600"
          }`}
        >
          <Trash2 className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-rose-700 dark:text-rose-300">{t("data.delete")}</p>
            <p className="text-xs text-vanta-muted mt-1">
              {confirmingDelete
                ? "Click again to confirm. This cannot be undone."
                : "Permanently delete ALL data tied to your shop. Cannot be undone."}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
