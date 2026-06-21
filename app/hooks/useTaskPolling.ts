// =============================================================================
// VANTA OS — useTaskPolling Hook (Section 7)
// Frontend polls GET /api/tasks/:id every 2-3s. Source of truth is the DB,
// so reconnecting after the phone sleeps just re-fetches current state.
// =============================================================================

import { useEffect, useState, useRef, useCallback } from "react";

export interface TaskPollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Manually refresh once. */
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 2500;
const TERMINAL_STATUSES = new Set(["COMPLETED", "ERROR", "CANCELLED", "REVERTED"]);

export function useTaskPolling<T>(
  taskId: string | null,
  options?: {
    intervalMs?: number;
    isTerminal?: (data: T) => boolean;
    fetcher?: (id: string) => Promise<T>;
  },
): TaskPollingState<T> {
  const intervalMs = options?.intervalMs ?? POLL_INTERVAL_MS;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const defaultFetcher = useCallback(async (id: string): Promise<T> => {
    const r = await fetch(`/api/tasks/${id}`);
    if (!r.ok) throw new Error(`Failed to fetch task ${id}: ${r.status}`);
    return (await r.json()) as T;
  }, []);

  const fetcher = options?.fetcher ?? defaultFetcher;

  const checkTerminal = useCallback(
    (d: T): boolean => {
      if (options?.isTerminal) return options.isTerminal(d);
      if (d && typeof d === "object" && "status" in d) {
        return TERMINAL_STATUSES.has((d as { status: string }).status);
      }
      return false;
    },
    [options?.isTerminal],
  );

  const refresh = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetcher(taskId);
      setData(d);
      if (checkTerminal(d) && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [taskId, fetcher, checkTerminal]);

  useEffect(() => {
    if (!taskId) return;
    refresh();

    intervalRef.current = setInterval(refresh, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId, intervalMs, refresh]);

  return { data, loading, error, refresh };
}

/** Poll multiple tasks (for the Task History view). */
export function useTasksListPolling(
  refreshKey: number = 0,
  options?: { intervalMs?: number },
): TaskPollingState<Array<{ id: string; status: string; command: string }>> {
  const intervalMs = options?.intervalMs ?? 10_000; // Less frequent for the list
  const [data, setData] = useState<Array<{ id: string; status: string; command: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const r = await fetch("/api/tasks?limit=50");
      if (!r.ok) throw new Error(`Failed to fetch tasks: ${r.status}`);
      const json = (await r.json()) as { tasks: Array<{ id: string; status: string; command: string }> };
      setData(json.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
    const interval = setInterval(fetchList, intervalMs);
    return () => clearInterval(interval);
  }, [fetchList, intervalMs, refreshKey]);

  return {
    data,
    loading,
    error,
    refresh: fetchList,
  };
}
