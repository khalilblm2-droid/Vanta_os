// =============================================================================
// VANTA OS — Toaster (Section 49)
// Global, non-blocking toast notification system.
// Top-right corner, auto-dismiss after 4 seconds.
// Color coding: blue=info, green=success, red=error, yellow=warning.
// =============================================================================

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "~/lib/utils";

type ToastSeverity = "info" | "success" | "error" | "warning";

interface Toast {
  id: string;
  severity: ToastSeverity;
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  info: (title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const SEVERITY_STYLES: Record<ToastSeverity, { bg: string; icon: ReactNode; border: string }> = {
  info: {
    bg: "bg-vanta-600 text-white",
    border: "border-vanta-700",
    icon: <Info className="h-5 w-5" aria-hidden="true" />,
  },
  success: {
    bg: "bg-emerald-600 text-white",
    border: "border-emerald-700",
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
  },
  error: {
    bg: "bg-rose-600 text-white",
    border: "border-rose-700",
    icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
  },
  warning: {
    bg: "bg-amber-500 text-white",
    border: "border-amber-600",
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = t.durationMs ?? 4000;
      setToasts((prev) => [...prev, { ...t, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const ctx: ToastContextValue = {
    toast,
    info: (title, message) => toast({ severity: "info", title, message }),
    success: (title, message) => toast({ severity: "success", title, message }),
    error: (title, message) => toast({ severity: "error", title, message }),
    warning: (title, message) => toast({ severity: "warning", title, message }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto"
        role="region"
        aria-label="Toast notifications"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const s = SEVERITY_STYLES[t.severity];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 24, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg border",
                  s.bg,
                  s.border,
                )}
                role="alert"
              >
                <div className="mt-0.5 shrink-0">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t.title}</p>
                  {t.message && <p className="text-xs opacity-90 mt-0.5">{t.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-1 rounded hover:bg-white/10 transition"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
