// =============================================================================
// VANTA OS — useKeyboardShortcuts Hook (Section 25, Section 47)
// - Cmd+K / Ctrl+K → open Command Palette
// - Esc → close any open modal/sheet
// - ↑ / ↓ → cycle command history (handled in canvas component)
// - All elements operable via keyboard alone (WCAG 2.1 AA — Section 47)
// =============================================================================

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  /** Key combo, e.g. "mod+k" (mod = Cmd on Mac, Ctrl on Windows) */
  combo: string;
  handler: (e: KeyboardEvent) => void;
  /** Don't trigger when focus is in an input/textarea (default: false) */
  allowInInput?: boolean;
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function matchesCombo(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const wantMod = parts.includes("mod");
  const wantShift = parts.includes("shift");
  const wantAlt = parts.includes("alt");

  const isMod = isMac() ? e.metaKey : e.ctrlKey;
  if (wantMod !== isMod) return false;
  if (wantShift !== e.shiftKey) return false;
  if (wantAlt !== e.altKey) return false;

  return e.key.toLowerCase() === key;
}

function isInInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (!matchesCombo(e, s.combo)) continue;
        if (!s.allowInInput && isInInput(e.target)) continue;
        e.preventDefault();
        s.handler(e);
        return;
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/** Convenience helper for the global Cmd+K / Ctrl+K command palette. */
export function useCommandPaletteShortcut(onOpen: () => void): void {
  useKeyboardShortcuts([
    { combo: "mod+k", handler: () => onOpen(), allowInInput: true },
    { combo: "ctrl+k", handler: () => onOpen(), allowInInput: true },
  ]);
}

/** Trap focus inside a modal/sheet for accessibility (WCAG 2.1 AA — Section 47). */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", handleTab);
    return () => container.removeEventListener("keydown", handleTab);
  }, [ref, active]);
}
