// =============================================================================
// VANTA OS — Settings (Section 9.5, Section 43, Section 55, Section 61)
// Language switcher, notification preferences, agent permission guardrails,
// kill switch with confirmation, persona selection.
// =============================================================================

import { useState } from "react";
import { type LoaderFunctionArgs, type HeadersArgs, type ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useSubmit } from "@remix-run/react";
import { Shield, Bell, Globe, Sparkles, AlertTriangle, Power } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { validate, UpdateSettingsSchema } from "~/lib/validation/schemas";
import { useToast } from "~/components/ui/Toaster";
import { HelpTooltip } from "~/components/ui/HelpTooltip";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { useEffect } from "react";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  return json({
    shop: {
      preferredLanguage: ctx.shop.preferredLanguage,
      agentPersona: ctx.shop.agentPersona,
      canWriteProducts: ctx.shop.canWriteProducts,
      canWriteCollections: ctx.shop.canWriteCollections,
      canWriteInventory: ctx.shop.canWriteInventory,
      canWriteMetafields: ctx.shop.canWriteMetafields,
      canWriteThemes: ctx.shop.canWriteThemes,
      canReadOrders: ctx.shop.canReadOrders,
      canReadCustomers: ctx.shop.canReadCustomers,
      requiresApprovalOnBulk: ctx.shop.requiresApprovalOnBulk,
      bulkThreshold: ctx.shop.bulkThreshold,
      notifyOnTaskComplete: ctx.shop.notifyOnTaskComplete,
      notifyOnGuardianAlert: ctx.shop.notifyOnGuardianAlert,
      notifyOnError: ctx.shop.notifyOnError,
      emailNotifications: ctx.shop.emailNotifications,
      guardianModeEnabled: ctx.shop.guardianModeEnabled,
      guardianIntervalHours: ctx.shop.guardianIntervalHours,
      killSwitchEnabled: ctx.shop.killSwitchEnabled,
      killSwitchReason: ctx.shop.killSwitchReason,
    },
    locale: ctx.shop.preferredLanguage as Locale,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
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

export default function Settings() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const toast = useToast();
  const submit = useSubmit();
  const [form, setForm] = useState(data.shop);
  const [killSwitchConfirm, setKillSwitchConfirm] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      submit(JSON.stringify(form), {
        method: "post",
        encType: "application/json",
        replace: true,
      });
      toast.success(t("settings.saved"));
    }, 800);
    return () => clearTimeout(id);
  }, [form, submit, toast, t]);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleKillSwitch = () => {
    if (!form.killSwitchEnabled && !killSwitchConfirm) {
      setKillSwitchConfirm(true);
      return;
    }
    setKillSwitchConfirm(false);
    setField("killSwitchEnabled", !form.killSwitchEnabled);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      </div>

      {/* Kill switch — Section 43 */}
      <div className={`vanta-card p-5 ${form.killSwitchEnabled ? "border-rose-400 dark:border-rose-600" : ""}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Power className="h-4 w-4" />
              {t("settings.killSwitch.title")}
              <HelpTooltip content={t("settings.killSwitch.hint")} />
            </h2>
          </div>
          <Toggle
            checked={form.killSwitchEnabled}
            onChange={toggleKillSwitch}
            ariaLabel={t("settings.killSwitch.label")}
            danger
          />
        </div>
        {killSwitchConfirm && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-700">
            <p className="text-xs text-rose-800 dark:text-rose-200 mb-2 flex items-start gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {t("settings.killSwitch.hint")}
            </p>
            <button
              type="button"
              onClick={toggleKillSwitch}
              className="px-3 py-1 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              {t("common.confirm")}
            </button>
            <button
              type="button"
              onClick={() => setKillSwitchConfirm(false)}
              className="ml-2 px-3 py-1 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800"
            >
              {t("common.cancel")}
            </button>
          </div>
        )}
        {form.killSwitchEnabled && (
          <input
            type="text"
            value={form.killSwitchReason ?? ""}
            onChange={(e) => setField("killSwitchReason", e.target.value)}
            placeholder={t("settings.killSwitch.reasonLabel")}
            className="mt-3 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
          />
        )}
      </div>

      {/* Language — Section 9.5 */}
      <Section title={t("settings.language")} icon={<Globe className="h-4 w-4" />} hint={t("settings.languageHint")}>
        <select
          value={form.preferredLanguage}
          onChange={(e) => setField("preferredLanguage", e.target.value as "en" | "ar")}
          className="w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
        >
          <option value="en">English</option>
          <option value="ar">العربية (Moroccan business)</option>
        </select>
      </Section>

      {/* Persona — Section 61 */}
      <Section title={t("settings.persona")} icon={<Sparkles className="h-4 w-4" />}>
        <div className="grid grid-cols-3 gap-2">
          {(["PROFESSIONAL", "FRIENDLY", "CONCISE"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setField("agentPersona", p)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                form.agentPersona === p
                  ? "bg-vanta-600 text-white"
                  : "bg-vanta-100 dark:bg-vanta-800 hover:opacity-80"
              }`}
            >
              {t(`settings.personaOptions.${p}`)}
            </button>
          ))}
        </div>
      </Section>

      {/* Permissions — Section 8 */}
      <Section
        title={t("settings.permissions")}
        icon={<Shield className="h-4 w-4" />}
        hint={t("settings.permissionsHint")}
      >
        <div className="space-y-2">
          <PermissionToggle
            label={t("settings.canWriteProducts")}
            checked={form.canWriteProducts}
            onChange={(v) => setField("canWriteProducts", v)}
          />
          <PermissionToggle
            label={t("settings.canWriteCollections")}
            checked={form.canWriteCollections}
            onChange={(v) => setField("canWriteCollections", v)}
          />
          <PermissionToggle
            label={t("settings.canWriteInventory")}
            checked={form.canWriteInventory}
            onChange={(v) => setField("canWriteInventory", v)}
          />
          <PermissionToggle
            label={t("settings.canWriteMetafields")}
            checked={form.canWriteMetafields}
            onChange={(v) => setField("canWriteMetafields", v)}
          />
          <PermissionToggle
            label={t("settings.canWriteThemes")}
            checked={form.canWriteThemes}
            onChange={(v) => setField("canWriteThemes", v)}
          />
          <PermissionToggle
            label={t("settings.canReadOrders")}
            checked={form.canReadOrders}
            onChange={(v) => setField("canReadOrders", v)}
          />
          <PermissionToggle
            label={t("settings.canReadCustomers")}
            checked={form.canReadCustomers}
            onChange={(v) => setField("canReadCustomers", v)}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-vanta-border">
          <PermissionToggle
            label={t("settings.requiresApprovalOnBulk")}
            checked={form.requiresApprovalOnBulk}
            onChange={(v) => setField("requiresApprovalOnBulk", v)}
          />
          <div className="mt-3">
            <label className="text-xs text-vanta-muted">{t("settings.bulkThreshold")}</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={form.bulkThreshold}
              onChange={(e) => setField("bulkThreshold", Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
            />
          </div>
        </div>
      </Section>

      {/* Guardian — Section 34 */}
      <Section
        title={t("settings.guardian.title")}
        icon={<Shield className="h-4 w-4" />}
        hint={t("settings.guardian.hint")}
      >
        <PermissionToggle
          label={t("settings.guardian.label")}
          checked={form.guardianModeEnabled}
          onChange={(v) => setField("guardianModeEnabled", v)}
        />
        <div className="mt-3">
          <label className="text-xs text-vanta-muted">{t("settings.guardian.intervalLabel")}</label>
          <input
            type="number"
            min={1}
            max={72}
            value={form.guardianIntervalHours}
            onChange={(e) => setField("guardianIntervalHours", Number(e.target.value))}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
          />
        </div>
      </Section>

      {/* Notifications — Section 56 */}
      <Section title={t("settings.notifications.title")} icon={<Bell className="h-4 w-4" />}>
        <div className="space-y-2">
          <PermissionToggle
            label={t("settings.notifications.onTaskComplete")}
            checked={form.notifyOnTaskComplete}
            onChange={(v) => setField("notifyOnTaskComplete", v)}
          />
          <PermissionToggle
            label={t("settings.notifications.onGuardianAlert")}
            checked={form.notifyOnGuardianAlert}
            onChange={(v) => setField("notifyOnGuardianAlert", v)}
          />
          <PermissionToggle
            label={t("settings.notifications.onError")}
            checked={form.notifyOnError}
            onChange={(v) => setField("notifyOnError", v)}
          />
          <PermissionToggle
            label={t("settings.notifications.email")}
            checked={form.emailNotifications}
            onChange={(v) => setField("emailNotifications", v)}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="vanta-card p-5">
      <div className="mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {hint && <p className="text-xs text-vanta-muted mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function PermissionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-sm">{label}</span>
      <Toggle checked={checked} onChange={onChange} ariaLabel={label} />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
  danger,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition shrink-0 ${
        checked
          ? danger
            ? "bg-rose-500"
            : "bg-vanta-600"
          : "bg-vanta-200 dark:bg-vanta-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
