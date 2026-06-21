// =============================================================================
// VANTA OS — Dashboard / Home (Section 9.2)
// Quick store stats, recent agent activity, plan/credits remaining,
// shortcuts to common actions.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { motion } from "framer-motion";
import { Sparkles, Activity, CreditCard, Zap, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { SkeletonDashboard } from "~/components/ui/Skeleton";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { formatCredits, formatRelativeTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const locale = ctx.shop.preferredLanguage as Locale;

  const [recentTasks, guardianCount, rateLimit] = await Promise.all([
    prisma.task.findMany({
      where: shopScoped(ctx.shopDomain),
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        command: true,
        status: true,
        priority: true,
        createdAt: true,
        completedAt: true,
        staff: { select: { name: true } },
      },
    }),
    prisma.guardianAlert.count({
      where: { ...shopScoped(ctx.shopDomain), resolved: false },
    }),
    prisma.rateLimitSnapshot.findFirst({
      where: shopScoped(ctx.shopDomain),
      orderBy: { recordedAt: "desc" },
      select: { currentlyAvailable: true, maximumAvailable: true },
    }),
  ]);

  return json({
    shopDomain: ctx.shopDomain,
    locale,
    creditsRemaining: ctx.shop.creditsRemaining,
    creditsUsedCycle: ctx.shop.creditsUsedCycle,
    plan: ctx.shop.plan,
    killSwitchEnabled: ctx.shop.killSwitchEnabled,
    recentTasks: recentTasks.map((t) => ({
      ...t,
      staffName: t.staff?.name ?? null,
    })),
    guardianCount,
    rateLimitPercent: rateLimit
      ? Math.round((rateLimit.currentlyAvailable / rateLimit.maximumAvailable) * 100)
      : null,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold">{t("nav.dashboard")}</h1>
          <p className="text-sm text-vanta-muted">{data.shopDomain}</p>
        </div>
        <Link
          to="/app/canvas"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm font-medium hover:bg-vanta-700 transition"
        >
          <Sparkles className="h-4 w-4" />
          {t("commandPalette.actions.newTask")}
        </Link>
      </motion.div>

      {/* Kill switch warning */}
      {data.killSwitchEnabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Kill switch is active</p>
            <p className="text-xs mt-0.5">
              The agent is globally disabled. New tasks will be rejected. Visit settings to re-enable.
            </p>
          </div>
          <Link
            to="/app/settings"
            className="text-xs underline shrink-0"
          >
            {t("nav.settings")}
          </Link>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label={t("billing.creditsRemaining")}
          value={formatCredits(data.creditsRemaining)}
          accent="vanta"
          link="/app/billing"
        />
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label={t("billing.creditsUsed")}
          value={formatCredits(data.creditsUsedCycle)}
          accent="vanta"
          link="/app/billing"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label={t("guardian.title")}
          value={String(data.guardianCount)}
          accent={data.guardianCount > 0 ? "warning" : "success"}
          link="/app/guardian"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="API health"
          value={data.rateLimitPercent !== null ? `${data.rateLimitPercent}%` : "—"}
          accent={
            data.rateLimitPercent === null
              ? "neutral"
              : data.rateLimitPercent > 30
                ? "success"
                : data.rateLimitPercent > 15
                  ? "warning"
                  : "danger"
          }
          link="/app/settings"
        />
      </div>

      {/* Recent activity */}
      <div className="vanta-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-vanta-muted" />
            Recent activity
          </h2>
          <Link to="/app/history" className="text-xs text-vanta-600 dark:text-vanta-300 hover:underline flex items-center gap-1">
            {t("history.title")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {data.recentTasks.length === 0 ? (
          <p className="text-sm text-vanta-muted text-center py-6">{t("history.empty")}</p>
        ) : (
          <ul className="divide-y divide-vanta-border">
            {data.recentTasks.map((task) => (
              <li key={task.id} className="py-3 flex items-start justify-between gap-3">
                <Link to={`/app/history/${task.id}`} className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.command}</p>
                  <p className="text-xs text-vanta-muted mt-0.5">
                    {task.staffName && `${t("task.initiatedBy", { staff: task.staffName })} · `}
                    {formatRelativeTime(task.createdAt, data.locale)}
                  </p>
                </Link>
                <StatusBadge status={task.status} locale={data.locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "vanta" | "success" | "warning" | "danger" | "neutral";
  link?: string;
}) {
  const accentClasses: Record<typeof accent, string> = {
    vanta: "text-vanta-600 dark:text-vanta-300 bg-vanta-100 dark:bg-vanta-800",
    success: "text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40",
    warning: "text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40",
    danger: "text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40",
    neutral: "text-vanta-muted bg-vanta-100 dark:bg-vanta-800",
  };
  const content = (
    <div className="vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition h-full">
      <div className="flex items-center gap-2 mb-2">
        <span className={`p-1.5 rounded ${accentClasses[accent]}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-vanta-muted mt-0.5">{label}</p>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const { t } = useTranslation(locale);
  const colors: Record<string, string> = {
    COMPLETED: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    ERROR: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    AWAITING_APPROVAL: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    QUEUED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    THINKING: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    EXECUTING: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
    CANCELLED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted",
    REVERTED: "bg-vanta-100 dark:bg-vanta-800 text-vanta-muted",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] ?? colors.QUEUED}`}>
      {t(`task.states.${status}`)}
    </span>
  );
}

export function ErrorBoundary() {
  return <SkeletonDashboard />;
}
