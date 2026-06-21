// =============================================================================
// VANTA OS — Feedback Widget (Section 82)
// Persistent bottom-left feedback button + mini-form.
// 1-5 star rating, optional message, optional screenshot URL.
// Stored in Feedback table.
// =============================================================================

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Star, X, Send } from "lucide-react";
import { useToast } from "~/components/ui/Toaster";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";

interface FeedbackWidgetProps {
  locale: Locale;
}

export function FeedbackWidget({ locale }: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { success } = useToast();
  const { t } = useTranslation(locale);

  const submit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          message: message.trim() || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      success(t("feedback.thanks"));
      setOpen(false);
      setRating(0);
      setMessage("");
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 px-3 py-2 rounded-full vanta-glass shadow-lg text-xs font-medium flex items-center gap-1.5 hover:scale-105 transition focus:outline-none focus:ring-2 focus:ring-vanta-500"
        aria-label={t("feedback.button")}
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        {t("feedback.button")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("feedback.title")}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="vanta-card w-full max-w-md p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("feedback.title")}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-vanta-100 dark:hover:bg-vanta-800 transition"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-vanta-muted mb-2">{t("feedback.rating")}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 focus:outline-none focus:ring-2 focus:ring-vanta-500 rounded"
                        aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={cn(
                            "h-6 w-6 transition",
                            (hoverRating || rating) >= n
                              ? "fill-amber-400 text-amber-400"
                              : "text-vanta-300 dark:text-vanta-600",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-vanta-muted mb-2">{t("feedback.message")}</p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-vanta-border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500 resize-none"
                    maxLength={5000}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg hover:bg-vanta-100 dark:hover:bg-vanta-800 transition"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={rating === 0 || submitting}
                    className="px-4 py-2 text-sm rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {t("feedback.submit")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
