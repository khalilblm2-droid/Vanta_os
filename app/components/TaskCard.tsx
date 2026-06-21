// =============================================================================
// VANTA OS — Task Card (Section 10, Section 21)
// The core execution canvas card with fluid state animations:
//   QUEUED:    spinning dashed circle / hourglass
//   THINKING:  glowing pulsing brain
//   EXECUTING: spinning gears / network nodes
//   COMPLETED: morphing checkmark with green glow
//   ERROR:     expandable error + retry
//   AWAITING_APPROVAL: bottom-sheet trigger (handled by ApprovalSheet)
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hourglass,
  Brain,
  Settings,
  Network,
  CheckCircle2,
  AlertCircle,
  Undo2,
  ChevronDown,
  ChevronUp,
  FileText,
  ListTree,
  PauseCircle,
} from "lucide-react";
import { MarkdownRenderer } from "~/components/ui/MarkdownRenderer";
import { cn, formatRelativeTime, truncate } from "~/lib/utils";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

export interface TaskData {
  id: string;
  command: string;
  status:
    | "QUEUED"
    | "THINKING"
    | "EXECUTING"
    | "AWAITING_APPROVAL"
    | "COMPLETED"
    | "ERROR"
    | "CANCELLED"
    | "REVERTED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  output?: string;
  errorMessage?: string;
  confidenceScore?: number;
  blastRadius?: number;
  requiresApproval?: boolean;
  initiatedByStaffName?: string;
  createdAt: string;
  completedAt?: string;
  deepLinks?: Array<{ label: string; url: string }>;
  undoable?: boolean;
}

interface TaskCardProps {
  task: TaskData;
  locale: Locale;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onUndo?: (taskId: string) => void;
  onRetry?: (taskId: string) => void;
  onViewDiff?: (taskId: string) => void;
  onViewLogs?: (taskId: string) => void;
}

const PRIORITY_BADGE: Record<TaskData["priority"], string> = {
  LOW: "bg-vanta-100 dark:bg-vanta-800 text-vanta-600 dark:text-vanta-300",
  NORMAL: "bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200",
  HIGH: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  URGENT: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
};

export function TaskCard({
  task,
  locale,
  onApprove,
  onReject,
  onUndo,
  onRetry,
  onViewDiff,
  onViewLogs,
}: TaskCardProps) {
  const { t } = useTranslation(locale);
  const [expanded, setExpanded] = useState(false);
  const state = task.status;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "vanta-card overflow-hidden",
        state === "ERROR" && "border-rose-300 dark:border-rose-700",
        state === "COMPLETED" && "border-emerald-300 dark:border-emerald-700",
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-3">
        <StateIcon state={state} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                PRIORITY_BADGE[task.priority],
              )}
            >
              {t(`canvas.priority.${task.priority}`)}
            </span>
            <span className="text-xs text-vanta-muted">
              {formatRelativeTime(task.createdAt, locale)}
            </span>
            {task.initiatedByStaffName && (
              <span className="text-xs text-vanta-muted">
                · {t("task.initiatedBy", { staff: task.initiatedByStaffName })}
              </span>
            )}
          </div>
          <p className="text-sm font-medium mt-1 break-words">{task.command}</p>
          {task.confidenceScore !== undefined && task.confidenceScore !== null && (
            <p
              className={cn(
                "text-xs mt-1.5",
                task.confidenceScore < 70 ? "text-amber-600 dark:text-amber-400" : "text-vanta-muted",
              )}
            >
              {t("task.confidence", { score: task.confidenceScore })}
              {task.confidenceScore < 70 && (
                <span className="block mt-0.5 italic">{t("task.lowConfidence")}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Output */}
      {task.output && (state === "COMPLETED" || state === "ERROR" || state === "AWAITING_APPROVAL") && (
        <div className="px-5 pb-4">
          <div className="rounded-lg bg-vanta-50 dark:bg-vanta-900/40 p-3">
            <MarkdownRenderer content={task.output} />
          </div>
        </div>
      )}

      {/* Awaiting approval actions */}
      {state === "AWAITING_APPROVAL" && (
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {task.blastRadius !== undefined && task.blastRadius > 0 && (
            <div className="w-full mb-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs">
              ⚠️ {t("task.blastRadius", {
                count: task.blastRadius,
                description: t(`task.states.${state}`),
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => onApprove?.(task.id)}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            {t("task.approve")}
          </button>
          <button
            type="button"
            onClick={() => onReject?.(task.id)}
            className="px-4 py-2 text-sm rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition"
          >
            {t("task.reject")}
          </button>
        </div>
      )}

      {/* Error actions */}
      {state === "ERROR" && (
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t("task.needsInput")}
          </button>
          <AnimatePresence>
            {expanded && task.errorMessage && (
              <motion.pre
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-xs overflow-x-auto"
              >
                {task.errorMessage}
              </motion.pre>
            )}
          </AnimatePresence>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRetry?.(task.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition"
            >
              {t("task.retry")}
            </button>
          </div>
        </div>
      )}

      {/* Completed actions */}
      {state === "COMPLETED" && (
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {task.undoable && (
            <button
              type="button"
              onClick={() => onUndo?.(task.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1"
            >
              <Undo2 className="h-3 w-3" />
              {t("task.undo")}
            </button>
          )}
          {onViewDiff && (
            <button
              type="button"
              onClick={() => onViewDiff(task.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              {t("task.viewDiff")}
            </button>
          )}
          {onViewLogs && (
            <button
              type="button"
              onClick={() => onViewLogs(task.id)}
              className="px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition flex items-center gap-1"
            >
              <ListTree className="h-3 w-3" />
              {t("task.viewLogs")}
            </button>
          )}
          {task.deepLinks?.slice(0, 3).map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs rounded-lg bg-vanta-100 dark:bg-vanta-800 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition truncate max-w-[180px]"
              title={link.label}
            >
              {truncate(link.label, 30)} ↗
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// --- State icons with animations (Section 21) --------------------------------

function StateIcon({ state }: { state: TaskData["status"] }) {
  const iconClass = "h-5 w-5 shrink-0 mt-0.5";

  switch (state) {
    case "QUEUED":
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="mt-0.5"
        >
          <Hourglass className={cn(iconClass, "text-vanta-muted")} />
        </motion.div>
      );
    case "THINKING":
      return (
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            filter: [
              "drop-shadow(0 0 0px rgba(124,92,255,0))",
              "drop-shadow(0 0 8px rgba(124,92,255,0.6))",
              "drop-shadow(0 0 0px rgba(124,92,255,0))",
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="mt-0.5"
        >
          <Brain className={cn(iconClass, "text-vanta-600 dark:text-vanta-300")} />
        </motion.div>
      );
    case "EXECUTING":
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="mt-0.5"
        >
          <Settings className={cn(iconClass, "text-vanta-600 dark:text-vanta-300")} />
        </motion.div>
      );
    case "AWAITING_APPROVAL":
      return <PauseCircle className={cn(iconClass, "text-amber-500")} />;
    case "COMPLETED":
      return (
        <motion.div
          initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-0.5"
        >
          <CheckCircle2 className={cn(iconClass, "text-emerald-500")} />
        </motion.div>
      );
    case "ERROR":
      return (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-0.5"
        >
          <AlertCircle className={cn(iconClass, "text-rose-500")} />
        </motion.div>
      );
    case "CANCELLED":
      return <AlertCircle className={cn(iconClass, "text-vanta-muted")} />;
    case "REVERTED":
      return <Undo2 className={cn(iconClass, "text-vanta-muted")} />;
    default:
      return <Network className={cn(iconClass, "text-vanta-muted")} />;
  }
}
