// =============================================================================
// VANTA OS — Agent Canvas (Section 9.3, Section 10, Section 27, Section 28,
// Section 31, Section 50, Section 65)
// The core feature: a task-submission UI with empty-state prompt starters,
// voice input, command-history (↑ arrow), char counter, cost estimator,
// offline protection, priority selection, and a live task feed.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, WifiOff, Sparkles, ChevronUp } from "lucide-react";
import { TaskCard, type TaskData } from "~/components/TaskCard";
import { useToast } from "~/components/ui/Toaster";
import { useOffline } from "~/hooks/useOffline";
import { useVoiceInput } from "~/hooks/useVoiceInput";
import { useCommandHistory, useHistoryCursor } from "~/hooks/useCommandHistory";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";
import { cn } from "~/lib/utils";

const MAX_CHARS = 2000; // Section 65

interface AgentCanvasProps {
  locale: Locale;
  shopDomain: string;
  /** Initial tasks to render (server-rendered). */
  initialTasks?: TaskData[];
  /** Called when the user submits a new command. */
  onSubmit?: (input: { command: string; priority: TaskData["priority"]; language: string }) => Promise<TaskData | null>;
}

const PROMPT_STARTERS: Array<{ key: string }> = [
  { key: "1" },
  { key: "2" },
  { key: "3" },
  { key: "4" },
];

export function AgentCanvas({ locale, shopDomain, initialTasks = [], onSubmit }: AgentCanvasProps) {
  const { t } = useTranslation(locale);
  const { info, error: errorToast, warning } = useToast();
  const [command, setCommand] = useState("");
  const [priority, setPriority] = useState<TaskData["priority"]>("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Section 50 — command history
  const { history, pushCommand } = useCommandHistory(shopDomain);
  const cursor = useHistoryCursor(history);

  // Section 31 — voice input
  const voice = useVoiceInput(locale === "ar" ? "ar-MA" : "en-US");

  // Section 28 — offline awareness
  const { isOffline } = useOffline(() => {
    info(t("toasts.online"));
  });

  useEffect(() => {
    if (isOffline) warning(t("toasts.offline"));
  }, [isOffline, warning, t]);

  // Sync voice transcript into the input
  useEffect(() => {
    if (voice.transcript) {
      setCommand((prev) => (prev ? `${prev} ${voice.transcript}`.trim() : voice.transcript));
      voice.reset();
    }
  }, [voice.transcript, voice]);

  // Section 65 — character limit + cost estimator
  const charCount = command.length;
  const overLimit = charCount > MAX_CHARS;
  const estimatedCredits = Math.max(1, Math.ceil(charCount / 500));

  // Poll tasks every 2.5s (Section 7)
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch("/api/tasks?limit=20");
        if (!r.ok) return;
        const json = (await r.json()) as { tasks: TaskData[] };
        setTasks(json.tasks);
      } catch {
        // Silent
      }
    };
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = command.trim();
      if (!trimmed || overLimit || submitting || isOffline) return;

      setSubmitting(true);
      try {
        const result = onSubmit
          ? await onSubmit({ command: trimmed, priority, language: locale })
          : await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: trimmed, priority, language: locale }),
            }).then((r) => (r.ok ? r.json() : null)) as TaskData | null;

        if (result) {
          setTasks((prev) => [result, ...prev]);
          setCommand("");
          cursor.reset();
          await pushCommand(trimmed);
          info(t("toasts.taskQueued"));
        }
      } catch (err) {
        errorToast(t("common.error"), err instanceof Error ? err.message : undefined);
      } finally {
        setSubmitting(false);
      }
    },
    [command, overLimit, submitting, isOffline, priority, locale, onSubmit, pushCommand, cursor, info, errorToast, t],
  );

  // Section 50 — ↑/↓ arrow cycling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "ArrowUp" && history.length > 0) {
      e.preventDefault();
      const c = cursor.previous();
      if (c !== undefined) setCommand(c);
    } else if (e.key === "ArrowDown" && history.length > 0) {
      e.preventDefault();
      const c = cursor.next();
      setCommand(c ?? "");
    }
  };

  const handleStarterClick = (key: string) => {
    const text = t(`canvas.starters.${key}`);
    setCommand(text);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Empty state with prompt starters (Section 27) */}
      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-vanta-100 dark:bg-vanta-800 mb-4"
            >
              <Sparkles className="h-8 w-8 text-vanta-500" aria-hidden="true" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-2">{t("canvas.title")}</h2>
            <p className="text-sm text-vanta-muted mb-6">{t("canvas.subtitle")}</p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-vanta-muted">
                {t("canvas.starters.title")}
              </p>
              {PROMPT_STARTERS.map(({ key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleStarterClick(key)}
                  className="block w-full text-left px-4 py-2.5 rounded-lg vanta-card hover:border-vanta-400 dark:hover:border-vanta-500 transition text-sm"
                >
                  {t(`canvas.starters.${key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task feed */}
      {tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} locale={locale} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Input area (Section 65) */}
      <div className="border-t border-vanta-border vanta-glass p-3 sm:p-4">
        {isOffline && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <WifiOff className="h-3.5 w-3.5" />
            <span>{t("canvas.offline.title")}</span>
            <span className="opacity-70">· {t("canvas.offline.body")}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("canvas.placeholder")}
              disabled={isOffline}
              maxLength={MAX_CHARS}
              rows={2}
              className={cn(
                "w-full px-3 py-2.5 pr-12 rounded-lg border bg-transparent text-sm outline-none focus:ring-2 focus:ring-vanta-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed",
                overLimit
                  ? "border-rose-400 dark:border-rose-600"
                  : "border-vanta-border",
              )}
              aria-label={t("canvas.placeholder")}
            />
            {voice.supported && (
              <button
                type="button"
                onClick={voice.listening ? voice.stop : voice.start}
                className={cn(
                  "absolute top-2 right-2 p-1.5 rounded-lg transition",
                  voice.listening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-vanta-muted hover:bg-vanta-100 dark:hover:bg-vanta-800",
                )}
                aria-label={t("canvas.voice")}
                disabled={isOffline}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            {voice.listening && (
              <p className="text-xs text-rose-500 mt-1 animate-pulse">
                ● Listening... {voice.interimTranscript}
              </p>
            )}
            {voice.error && (
              <p className="text-xs text-rose-500 mt-1">{voice.error}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-vanta-muted">
              <span className={cn(overLimit && "text-rose-500 font-medium")}>
                {t("canvas.charCount", { count: charCount, max: MAX_CHARS })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-vanta-100 dark:bg-vanta-800">
                {t("canvas.estimatedCost", { credits: estimatedCredits })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskData["priority"])}
                className="px-2 py-1.5 text-xs rounded-lg border border-vanta-border bg-transparent outline-none focus:ring-2 focus:ring-vanta-500"
                aria-label={t("canvas.priority.label")}
              >
                {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                  <option key={p} value={p}>
                    {t(`canvas.priority.${p}`)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!command.trim() || overLimit || submitting || isOffline}
                className="px-4 py-1.5 text-sm rounded-lg bg-vanta-600 text-white hover:bg-vanta-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {t("canvas.submit")}
              </button>
            </div>
          </div>
          {history.length > 0 && (
            <p className="text-[10px] text-vanta-muted flex items-center gap-1">
              <ChevronUp className="h-3 w-3" />
              Press ↑ to recall previous commands
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
