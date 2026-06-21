// =============================================================================
// VANTA OS — PolarisProvider (Section 24)
// Wraps Polaris AppProvider with theme sync to Shopify Admin.
// =============================================================================

import { useEffect, type ReactNode } from "react";
import { AppProvider } from "@shopify/polaris";

// CRITICAL FIX: Use the correct CSS path for Polaris v13+ in Vite.
// The old path "@shopify/polaris/build/esm/styles.css" does not resolve
// correctly in Vite's dependency optimizer. Use the package root path.
import "@shopify/polaris/build/esm/styles.css";

import { useTheme } from "~/hooks/useTheme";
import type { Locale } from "~/lib/i18n/useTranslation";

interface PolarisProviderProps {
  locale: Locale;
  children: ReactNode;
}

// Minimal en + ar translations for Polaris
const POLARIS_I18N = {
  en: {
    Polaris: {
      Frame: { skipToContent: "Skip to content", navigationLabel: "Navigation" },
      TextField: { clearButton: "Clear" },
      ResourceList: {
        sortingLabel: "Sort by",
        defaultItemSingular: "item",
        defaultItemPlural: "items",
      },
    },
  },
  ar: {
    Polaris: {
      Frame: { skipToContent: "تخطّى إلى المحتوى", navigationLabel: "التصفّح" },
      TextField: { clearButton: "مسح" },
      ResourceList: {
        sortingLabel: "رتّب حسب",
        defaultItemSingular: "عنصر",
        defaultItemPlural: "عناصر",
      },
    },
  },
};

export function PolarisProvider({ locale, children }: PolarisProviderProps) {
  const { theme } = useTheme();

  // Section 24 — sync theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-polaris-theme", theme);
  }, [theme]);

  // Section 12 — RTL
  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <AppProvider
      theme={{
        colorScheme: theme,
        colors: {
          primary: "#7c5cff",
          primaryDark: "#5b3fd6",
        },
      }}
      i18n={POLARIS_I18N[locale] ?? POLARIS_I18N.en}
    >
      {children}
    </AppProvider>
  );
}
