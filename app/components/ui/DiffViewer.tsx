// =============================================================================
// VANTA OS — Diff Viewer (Section 60)
// GitHub-style before/after visual diff for task changes.
// Green for added text, red for removed text.
// =============================================================================

import { Plus, Minus } from "lucide-react";
import { cn } from "~/lib/utils";

export interface DiffEntry {
  resourceType: string;
  resourceId: string;
  resourceTitle?: string;
  field: string;
  before?: string;
  after?: string;
}

interface DiffViewerProps {
  diffs: DiffEntry[];
}

export function DiffViewer({ diffs }: DiffViewerProps) {
  if (diffs.length === 0) {
    return (
      <p className="text-sm text-vanta-muted italic">
        No field-level changes were recorded for this task.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {diffs.map((d, i) => (
        <div
          key={`${d.resourceId}-${d.field}-${i}`}
          className="vanta-card overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-vanta-border bg-vanta-50 dark:bg-vanta-900/40">
            <p className="text-xs text-vanta-muted uppercase tracking-wide">
              {d.resourceType}
            </p>
            <p className="text-sm font-semibold">{d.resourceTitle ?? d.resourceId}</p>
            <p className="text-xs text-vanta-muted mt-0.5">Field: {d.field}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-vanta-border">
            <DiffSide label="Before" value={d.before} variant="removed" />
            <DiffSide label="After" value={d.after} variant="added" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DiffSide({
  label,
  value,
  variant,
}: {
  label: string;
  value?: string;
  variant: "added" | "removed";
}) {
  const isAdded = variant === "added";
  return (
    <div
      className={cn(
        "px-4 py-3 font-mono text-sm",
        isAdded
          ? "bg-emerald-50 dark:bg-emerald-950/30"
          : "bg-rose-50 dark:bg-rose-950/30",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase tracking-wide",
          isAdded ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
        )}
      >
        {isAdded ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {label}
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap break-words",
          isAdded
            ? "text-emerald-900 dark:text-emerald-100"
            : "text-rose-900 dark:text-rose-100",
        )}
      >
        {value || <span className="italic opacity-60">(empty)</span>}
      </p>
    </div>
  );
}
