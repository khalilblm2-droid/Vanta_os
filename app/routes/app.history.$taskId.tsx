// =============================================================================
// VANTA OS — Task Detail (Section 9.4, Section 52, Section 60)
// Full task view: command, output, diff viewer, logs, staff attribution,
// print/export PDF button, undo button.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { Printer, Undo2, ArrowLeft, ListTree, FileText } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { prisma } from "~/lib/db.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { MarkdownRenderer } from "~/components/ui/MarkdownRenderer";
import { DiffViewer, type DiffEntry } from "~/components/ui/DiffViewer";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { formatDateTime } from "~/lib/utils";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const taskId = args.params.taskId!;
  const task = await prisma.task.findFirst({
    where: { id: taskId, ...{ shopDomain: ctx.shopDomain } },
    include: {
      staff: { select: { name: true, email: true } },
      logs: { orderBy: { timestamp: "asc" } },
      diffs: { orderBy: { timestamp: "asc" } },
      _count: { select: { undoSnapshots: true } },
    },
  });
  if (!task) {
    throw new Response("Not found", { status: 404 });
  }
  return json({
    task: {
      id: task.id,
      command: task.command,
      status: task.status,
      priority: task.priority,
      output: task.output ?? "",
      errorMessage: task.errorMessage ?? null,
      confidenceScore: task.confidenceScore,
      blastRadius: task.blastRadius,
      blastRadiusDescription: task.blastRadiusDescription,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      staffName: task.staff?.name ?? null,
      staffEmail: task.staff?.email ?? null,
      undoable: task._count.undoSnapshots > 0 && task.status === "COMPLETED",
      undoSnapshotCount: task._count.undoSnapshots,
    },
    diffs: task.diffs.map(
      (d) =>
        ({
          resourceType: d.resourceType,
          resourceId: d.resourceId,
          resourceTitle: d.resourceTitle ?? undefined,
          field: d.field,
          before: d.before ?? undefined,
          after: d.after ?? undefined,
        }) satisfies DiffEntry,
    ),
    logs: task.logs.map((l) => ({
      id: l.id,
      step: l.step,
      level: l.level,
      message: l.message,
      timestamp: l.timestamp.toISOString(),
    })),
    locale: ctx.shop.preferredLanguage as Locale,
    timezone: ctx.shop.ianaTimezone ?? undefined,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function TaskDetail() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const task = data.task;

  const handlePrint = () => window.print();
  const handleUndo = async () => {
    if (!confirm(t("task.undo") + "?")) return;
    await fetch(`/api/tasks/${task.id}/undo`, { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          to="/app/history"
          className="text-sm text-vanta-muted hover:text-vanta-700 dark:hover:text-vanta-200 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("history.title")}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 text-sm rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            {t("task.printReport")}
          </button>
          {task.undoable && (
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 text-sm rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:opacity-80 transition flex items-center gap-1.5"
            >
              <Undo2 className="h-3.5 w-3.5" />
              {t("task.undo")}
            </button>
          )}
        </div>
      </div>

      {/* Task summary card */}
      <div className="vanta-card p-5 print:border-0 print:shadow-none">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-vanta-muted">
            {t(`task.states.${task.status}`)}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200">
            {t(`canvas.priority.${task.priority}`)}
          </span>
        </div>
        <p className="text-lg font-semibold mb-2 break-words">{task.command}</p>
        <div className="text-xs text-vanta-muted space-y-0.5">
          {task.staffName && (
            <p>{t("task.initiatedBy", { staff: task.staffName })}</p>
          )}
          <p>{formatDateTime(task.createdAt, data.locale, data.timezone)}</p>
          {task.completedAt && (
            <p>Completed: {formatDateTime(task.completedAt, data.locale, data.timezone)}</p>
          )}
          {task.confidenceScore !== null && task.confidenceScore !== undefined && (
            <p>{t("task.confidence", { score: task.confidenceScore })}</p>
          )}
        </div>
      </div>

      {/* Output */}
      {task.output && (
        <div className="vanta-card p-5">
          <h2 className="font-semibold mb-3">Output</h2>
          <MarkdownRenderer content={task.output} />
        </div>
      )}

      {/* Error */}
      {task.errorMessage && (
        <div className="vanta-card p-5 border-rose-300 dark:border-rose-700">
          <h2 className="font-semibold mb-3 text-rose-700 dark:text-rose-300">{t("task.needsInput")}</h2>
          <pre className="text-xs bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {task.errorMessage}
          </pre>
        </div>
      )}

      {/* Diff viewer (Section 60) */}
      {data.diffs.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-vanta-muted" />
            {t("task.viewDiff")}
          </h2>
          <DiffViewer diffs={data.diffs} />
        </div>
      )}

      {/* Logs (Section 7) */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ListTree className="h-4 w-4 text-vanta-muted" />
          {t("task.viewLogs")}
        </h2>
        <div className="vanta-card p-3 max-h-96 overflow-y-auto font-mono text-xs">
          {data.logs.map((log) => (
            <div key={log.id} className="py-1 border-b border-vanta-border last:border-0">
              <span className="text-vanta-muted">[{new Date(log.timestamp).toISOString()}]</span>{" "}
              <span className="font-semibold">{log.step}</span>: {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
