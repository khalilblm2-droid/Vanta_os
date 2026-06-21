// =============================================================================
// VANTA OS — useCommandHistory Hook (Section 50)
// Stores last 20 commands per shop in Postgres (not localStorage).
// ↑ arrow cycles through previous commands like a terminal shell.
// =============================================================================

import { useEffect, useState, useCallback } from "react";

export interface UseCommandHistoryResult {
  history: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  pushCommand: (command: string) => Promise<void>;
}

export function useCommandHistory(shopDomain?: string): UseCommandHistoryResult {
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/command-history?limit=20");
      if (!r.ok) return;
      const json = (await r.json()) as { commands: string[] };
      setHistory(json.commands);
    } catch {
      // Silent fail — history is a convenience, not critical
    } finally {
      setLoading(false);
    }
  }, []);

  const pushCommand = useCallback(async (command: string) => {
    try {
      await fetch("/api/command-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      setHistory((prev) => [command, ...prev.filter((c) => c !== command)].slice(0, 20));
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, shopDomain]);

  return { history, loading, refresh, pushCommand };
}

/**
 * Cycle through history with the ↑/↓ arrow keys, terminal-style.
 * Returns the current index + a function to reset the cycle.
 */
export function useHistoryCursor(history: string[]) {
  const [index, setIndex] = useState<number>(-1);

  const previous = useCallback(() => {
    if (history.length === 0) return undefined;
    setIndex((i) => {
      const next = i + 1;
      if (next >= history.length) return i;
      return next;
    });
  }, [history.length]);

  const next = useCallback(() => {
    if (history.length === 0) return undefined;
    setIndex((i) => {
      const n = i - 1;
      if (n < 0) return -1;
      return n;
    });
  }, [history.length]);

  const reset = useCallback(() => setIndex(-1), []);

  /** The current command pointed to by the cursor, or undefined. */
  const current = index >= 0 && index < history.length ? history[index] : undefined;

  return { index, current, previous, next, reset };
}
