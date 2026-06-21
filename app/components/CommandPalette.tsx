// =============================================================================
// VANTA OS — Command Palette (Section 25)
// Global Cmd+K / Ctrl+K spotlight. Jump to a route or pre-fill a command.
// Power-user OS feel — no mouse needed.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, ArrowRight, Zap } from "lucide-react";
import { useCommandPaletteShortcut, useFocusTrap } from "~/hooks/useKeyboardShortcuts";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";

interface PaletteItem {
  id: string;
  label: string;
  group: "actions" | "navigate" | "settings";
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  locale: Locale;
  /** Pre-fill the agent canvas with a command instead of navigating. */
  onSendToAgent?: (command: string) => void;
}

export function CommandPalette({ locale, onSendToAgent }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const { t } = useTranslation(locale);
  const dialogRef = useRef<HTMLDivElement>(null);

  useCommandPaletteShortcut(() => setOpen(true));
  useFocusTrap(dialogRef, open);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    return [
      {
        id: "new-task",
        label: t("commandPalette.actions.newTask"),
        group: "actions",
        icon: <Zap className="h-4 w-4" />,
        action: () => {
          if (onSendToAgent) {
            onSendToAgent(query);
          } else {
            navigate("/app/canvas");
          }
          setOpen(false);
          setQuery("");
        },
        keywords: ["task", "command", "agent"],
      },
      {
        id: "go-dashboard",
        label: t("commandPalette.actions.goDashboard"),
        group: "navigate",
        icon: <ArrowRight className="h-4 w-4" />,
        action: () => {
          navigate("/app");
          setOpen(false);
          setQuery("");
        },
      },
      {
        id: "go-canvas",
        label: t("commandPalette.actions.goCanvas"),
        group: "navigate",
        icon: <ArrowRight className="h-4 w-4" />,
        action: () => {
          navigate("/app/canvas");
          setOpen(false);
          setQuery("");
        },
      },
      {
        id: "go-history",
        label: t("commandPalette.actions.goHistory"),
        group: "navigate",
        icon: <ArrowRight className="h-4 w-4" />,
        action: () => {
          navigate("/app/history");
          setOpen(false);
          setQuery("");
        },
      },
      {
        id: "go-settings",
        label: t("commandPalette.actions.goSettings"),
        group: "settings",
        icon: <ArrowRight className="h-4 w-4" />,
        action: () => {
          navigate("/app/settings");
          setOpen(false);
          setQuery("");
        },
      },
      {
        id: "go-billing",
        label: t("commandPalette.actions.goBilling"),
        group: "settings",
        icon: <ArrowRight className="h-4 w-4" />,
        action: () => {
          navigate("/app/billing");
          setOpen(false);
          setQuery("");
        },
      },
      {
        id: "open-help",
        label: t("commandPalette.actions.openHelp"),
        group: "settings",
        icon: <ArrowRight className="h-4 w-4" />,
        action: () => {
          navigate("/app/help");
          setOpen(false);
          setQuery("");
        },
      },
    ];
  }, [navigate, onSendToAgent, query, t]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      return (
        item.label.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [items, query]);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Group items
  const grouped = useMemo(() => {
    const g: Record<string, PaletteItem[]> = { actions: [], navigate: [], settings: [] };
    for (const item of filtered) {
      g[item.group].push(item);
    }
    return g;
  }, [filtered]);

  // Flatten for keyboard nav
  const flat = useMemo(() => [...grouped.actions, ...grouped.navigate, ...grouped.settings], [grouped]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) item.action();
    }
  };

  // When query doesn't match a navigation item, treat it as a free-form command to send to agent
  const canSendQueryAsTask = query.trim().length > 3 && filtered.length === 0 && onSendToAgent;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t("commandPalette.placeholder")}
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="vanta-card w-full max-w-xl shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-vanta-border">
              <Search className="h-5 w-5 text-vanta-muted shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("commandPalette.placeholder")}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-vanta-muted"
                aria-label={t("commandPalette.placeholder")}
                autoFocus
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-vanta-100 dark:bg-vanta-800 text-vanta-muted">
                ESC
              </kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {canSendQueryAsTask && (
                <button
                  type="button"
                  onClick={() => {
                    onSendToAgent?.(query);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-vanta-100 dark:hover:bg-vanta-800 flex items-center justify-between gap-2 transition"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-vanta-500" />
                    Send "{query.slice(0, 60)}{query.length > 60 ? "…" : ""}" to agent
                  </span>
                  <CornerDownLeft className="h-3 w-3 text-vanta-muted" />
                </button>
              )}
              {flat.length === 0 && !canSendQueryAsTask && (
                <p className="px-3 py-6 text-sm text-vanta-muted text-center">
                  No matches. Try a different search.
                </p>
              )}
              {(["actions", "navigate", "settings"] as const).map((group) => {
                if (grouped[group].length === 0) return null;
                return (
                  <div key={group} className="mb-2">
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-vanta-muted">
                      {t(`commandPalette.groups.${group}`)}
                    </p>
                    {grouped[group].map((item) => {
                      const idx = flat.findIndex((f) => f.id === item.id);
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={item.action}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 transition",
                            isActive
                              ? "bg-vanta-100 dark:bg-vanta-800"
                              : "hover:bg-vanta-50 dark:hover:bg-vanta-900/40",
                          )}
                        >
                          <span className="flex items-center gap-2.5 text-sm">
                            <span className="text-vanta-muted">{item.icon}</span>
                            {item.label}
                          </span>
                          {isActive && <CornerDownLeft className="h-3 w-3 text-vanta-muted" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-vanta-border bg-vanta-50 dark:bg-vanta-900/40">
              <p className="text-[10px] text-vanta-muted">{t("commandPalette.hint")}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
