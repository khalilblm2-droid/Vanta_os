// =============================================================================
// VANTA OS — Onboarding Splash (Section 9.1, Section 75)
// First screen after install. Explains what the app does, links to Privacy
// Policy + Terms (Section 11), consent checkbox (disabled until checked),
// "Connect store" button. Triggers guided tour on first entry.
// =============================================================================

import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useSubmit } from "@remix-run/react";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

export async function loader(args: LoaderFunctionArgs) {
  try {
    const ctx = await requireAdmin(args);
    const wl = getWhitelabelConfig();
    return json({
      shopDomain: ctx.shopDomain,
      locale: ctx.shop.preferredLanguage as Locale,
      alreadyOnboarded: ctx.shop.completedOnboarding,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      privacyUrl: wl.privacyPolicyUrl,
      termsUrl: wl.termsOfServiceUrl,
    });
  } catch {
    throw redirect("/auth/login");
  }
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export async function action(args: ActionFunctionArgs) {
  const ctx = await requireAdmin(args);
  await prisma.shop.update({
    where: { id: ctx.shop.id },
    data: { completedOnboarding: true },
  });
  return redirect("/app");
}

export default function OnboardingSplash() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const [accepted, setAccepted] = useState(false);

  if (data.alreadyOnboarded) {
    // Already onboarded — bounce to dashboard
    if (typeof window !== "undefined") window.location.href = "/app";
  }

  return (
    <div className="min-h-screen bg-vanta-50 dark:bg-vanta-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="vanta-card w-full max-w-2xl p-8 sm:p-10"
      >
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-vanta-500 to-vanta-700 mb-4"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">{t("onboarding.title")}</h1>
          <p className="text-vanta-muted">{t("onboarding.subtitle")}</p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <FeatureCard
            icon={<Zap className="h-5 w-5 text-vanta-500" />}
            title="Instant execution"
            body="Tell VANTA what to do — it plans, confirms, and executes against your Shopify store."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-vanta-500" />}
            title="Always in control"
            body="Blast-radius checks, approval prompts, kill switch, and one-click undo for every change."
          />
          <FeatureCard
            icon={<CheckCircle2 className="h-5 w-5 text-vanta-500" />}
            title="Proactive Guardian"
            body="Background checks catch $0 prices, low inventory, and broken links before customers do."
          />
        </div>

        {/* Consent */}
        <Form method="post" className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-vanta-300 text-vanta-600 focus:ring-vanta-500"
              required
            />
            <span className="text-sm text-vanta-700 dark:text-vanta-200">
              {t("onboarding.consentLabel")}
            </span>
          </label>

          <div className="flex flex-wrap gap-4 text-xs text-vanta-muted">
            <Link to="/app/privacy" className="hover:underline text-vanta-600 dark:text-vanta-300">
              {t("onboarding.privacyLink")}
            </Link>
            <Link to="/app/terms" className="hover:underline text-vanta-600 dark:text-vanta-300">
              {t("onboarding.termsLink")}
            </Link>
          </div>

          <button
            type="submit"
            disabled={!accepted}
            className="w-full py-3 rounded-lg bg-vanta-600 text-white font-semibold hover:bg-vanta-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {accepted ? t("onboarding.connect") : t("onboarding.connectDisabled")}
          </button>
        </Form>

        <p className="text-center text-xs text-vanta-muted mt-6">
          © {new Date().getFullYear()} {getWhitelabelConfig().copyrightHolder}. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="p-4 rounded-lg bg-vanta-50 dark:bg-vanta-900/40 border border-vanta-border">
      <div className="mb-2">{icon}</div>
      <p className="font-semibold text-sm mb-1">{title}</p>
      <p className="text-xs text-vanta-muted">{body}</p>
    </div>
  );
}
