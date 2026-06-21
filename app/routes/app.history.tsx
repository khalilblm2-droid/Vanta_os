// =============================================================================
// VANTA OS — Task History List (Section 9.4)
// Searchable list of past tasks with status filter + staff attribution.
// =============================================================================

import { useState } from "react";
import { type LoaderFunctionArgs, type HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Search, Filter } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { shopScoped } from "~/lib/shopify/multi-tenant";
import { getSecurityHeaders } from "~/lib/security/headers";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { formatRelativeTime, truncate } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const url = new URL(args.request.url);
  const search = url.searchParams.get("q") ?? "";
  const filter = url.searchParams.get("filter") ?? "all";

  const statusFilter =
    filter === "completed"
      ? ["COMPLETED"]
      : filter === "failed"
        ? ["ERROR"]
        : filter === "reverted"
          ? ["REVERTED"]
          : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      ...shopScoped(ctx.shopDomain),
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
      ...(search
        ? { command: { contains: search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { staff: { select: { name: true } } },
  });

  return json({
    tasks: tasks.map((t) => ({
      id: t.id,
      command: t.command,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      staffName: t.staff?.name ?? null,
    })),
    locale: ctx.shop.preferredLanguage as Locale,
    search,
    filter,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function HistoryList() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const [search, setSearch] = useState(data.search);

  const filters: Array<{ key: string; label: string }> = [
    { key: "all", label: t("history.filterAll") },
    { key: "completed", label: t("history.filterCompleted") },
    { key: "failed", label: t("history.filterFailed") },
    { key: "reverted", label: t("history.filterReverted") },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("history.title")}</h1>
        <p className="text-sm text-vanta-muted">{t("history.subtitle")}</p>
      </div>

      {/* Search + filter */}
      <form method="get" className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-vanta-muted" />
          <input
            type="text"
            name="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("history.search")}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
          />
        </div>
        <select
          name="filter"
          defaultValue={data.filter}
          className="px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500"
        >
          {filters.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-vanta-600 text-white text-sm hover:bg-vanta-700 transition flex items-center gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          {t("common.search")}
        </button>
      </form>

      {/* List */}
      {data.tasks.length === 0 ? (
        <div className="vanta-card p-10 text-center">
          <p className="text-sm text-vanta-muted">{t("history.empty")}</p>
          <Link
            to="/app/canvas"
            className="inline-block mt-3 text-sm text-vanta-600 dark:text-vanta-300 hover:underline"
          >
            {t("commandPalette.actions.goCanvas")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.tasks.map((task) => (
            <li key={task.id}>
              <Link
                to={`/app/history/${task.id}`}
                className="block vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {truncate(task.command, 100)}
                    </p>
                    <p className="text-xs text-vanta-muted mt-1">
                      {task.staffName && `${t("task.initiatedBy", { staff: task.staffName })} · `}
                      {formatRelativeTime(task.createdAt, data.locale)}
                    </p>
                  </div>
                  <StatusBadge status={task.status} locale={data.locale} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${colors[status] ?? colors.QUEUED}`}>
      {t(`task.states.${status}`)}
    </span>
  );
}
