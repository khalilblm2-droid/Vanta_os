// =============================================================================
// VANTA OS — i18n Hook (Section 12, Section 20)
// - Loads en.json / ar.json
// - Falls back to English for missing keys
// - Auto-applies dir="rtl" at the root for Arabic
// - Translation function supports {param} interpolation
// =============================================================================

import { useMemo, useCallback } from "react";
import en from "~/lib/i18n/en.json";
import ar from "~/lib/i18n/ar.json";

const DICTIONARIES = { en, ar } as const;
export type Locale = keyof typeof DICTIONARIES;

export type TranslationShape = typeof en;

/** Resolve a dotted key path against a nested object. */
function resolve(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** Interpolate {param} placeholders. */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export interface UseTranslationReturn {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function useTranslation(locale: Locale = "en"): UseTranslationReturn {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES.en;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const value = resolve(dict, key);
      if (typeof value === "string") {
        return interpolate(value, params);
      }
      // Fallback to English
      const fallback = resolve(DICTIONARIES.en, key);
      if (typeof fallback === "string") {
        return interpolate(fallback, params);
      }
      return key; // Last-resort: return the key itself for developer visibility
    },
    [dict],
  );

  const dir = locale === "ar" ? "rtl" : "ltr";

  return useMemo(() => ({ locale, dir, t }), [locale, dir, t]);
}

/** Apply dir attribute to <html> when locale changes. */
export function applyDocumentDir(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}
