// =============================================================================
// VANTA OS — useOffline Hook (Section 28)
// Mobile connections drop frequently. Detect offline status, disable the
// command input to prevent lost prompts, auto-reconnect + refresh on return.
// =============================================================================

import { useEffect, useState, useCallback } from "react";

export interface UseOfflineResult {
  isOffline: boolean;
  wasOffline: boolean;
  /** Triggered exactly once when the connection returns. */
  onReconnect?: () => void;
}

export function useOffline(onReconnect?: () => void): UseOfflineResult {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      onReconnect?.();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [onReconnect]);

  return { isOffline, wasOffline };
}

/** Helper hook for toast callbacks on offline/online transitions. */
export function useOfflineToast(
  onOffline: () => void,
  onOnline: () => void,
): void {
  const handleOffline = useCallback(() => onOffline(), [onOffline]);
  const handleOnline = useCallback(() => onOnline(), [onOnline]);

  useEffect(() => {
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [handleOffline, handleOnline]);
}
