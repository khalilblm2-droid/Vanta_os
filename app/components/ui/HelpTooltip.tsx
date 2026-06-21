// =============================================================================
// VANTA OS — HelpTooltip (Section 55)
// Small ? icon that reveals a one-sentence explanation on hover/tap.
// Critical for: Kill Switch, Guardian Mode, Blast Radius, A/B Testing.
// =============================================================================

import { useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface HelpTooltipProps {
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function HelpTooltip({ content, side = "top", className }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  const sideClasses: Record<NonNullable<HelpTooltipProps["side"]>, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-vanta-muted hover:text-vanta-700 dark:hover:text-vanta-200 transition focus:outline-none focus:ring-2 focus:ring-vanta-500"
        aria-label="More information"
        aria-expanded={open}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-30 w-64 px-3 py-2 rounded-lg text-xs text-white bg-vanta-900 dark:bg-vanta-700 shadow-lg",
            sideClasses[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
