// =============================================================================
// VANTA OS — Utility helpers (className merge, format)
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string, locale: string = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = d.getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const dayMs = 86_400_000;
  if (absDiff < dayMs) {
    const hours = Math.round(diff / 3_600_000);
    return rtf.format(hours, "hour");
  }
  if (absDiff < 30 * dayMs) {
    const days = Math.round(diff / dayMs);
    return rtf.format(days, "day");
  }
  const months = Math.round(diff / (30 * dayMs));
  return rtf.format(months, "month");
}

export function formatDateTime(date: Date | string, locale: string = "en", timezone?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: timezone,
  }).format(d);
}

export function formatNumber(n: number, locale: string = "en"): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function truncate(text: string, max: number = 80): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export function formatCredits(n: number): string {
  if (n === Infinity) return "∞";
  return new Intl.NumberFormat("en").format(n);
}
