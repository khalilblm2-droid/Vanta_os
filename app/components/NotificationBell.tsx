// =============================================================================
// VANTA OS — Notification Bell (Section 78)
// Persistent notification center with badge count. Top header.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, X } from "lucide-react";
import { cn, formatRelativeTime } from "~/lib/utils";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

interface NotificationItem {
  id: string;
  type: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  locale: Locale;
}

const SEVERITY_DOT: Record<NotificationItem["severity"], string> = {
  INFO: "bg-vanta-500",
  SUCCESS: "bg-emerald-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-rose-500",
};

export function NotificationBell({ locale }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation(locale);

  const fetchNotifications = async () => {
    try {
      const r = await fetch("/api/notifications?limit=20");
      if (!r.ok) return;
      const json = (await r.json()) as { notifications: NotificationItem[] };
      setNotifications(json.notifications);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.read) markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-vanta-100 dark:hover:bg-vanta-800 transition focus:outline-none focus:ring-2 focus:ring-vanta-500"
        aria-label={t("notifications.title")}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 vanta-card shadow-2xl z-50"
            role="dialog"
            aria-label={t("notifications.title")}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-vanta-border">
              <div>
                <p className="font-semibold text-sm">{t("notifications.title")}</p>
                {unreadCount > 0 && (
                  <p className="text-xs text-vanta-muted">
                    {t("notifications.unread", { count: unreadCount })}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-vanta-600 dark:text-vanta-300 hover:underline flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  {t("notifications.markAllRead")}
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="p-6 text-center text-sm text-vanta-muted">
                  {t("common.loading")}
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="p-6 text-center text-sm text-vanta-muted">
                  {t("notifications.empty")}
                </div>
              )}
              {!loading &&
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-vanta-border last:border-0 hover:bg-vanta-50 dark:hover:bg-vanta-900/40 transition flex gap-3",
                      !n.read && "bg-vanta-50/50 dark:bg-vanta-900/20",
                    )}
                  >
                    <span
                      className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", SEVERITY_DOT[n.severity])}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{n.title}</p>
                        <span className="text-[10px] text-vanta-muted shrink-0">
                          {formatRelativeTime(n.createdAt, locale)}
                        </span>
                      </div>
                      <p className="text-xs text-vanta-muted mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
