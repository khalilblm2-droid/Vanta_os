// =============================================================================
// VANTA OS — useTheme Hook (Section 24)
// Syncs the React app's theme state with Shopify Admin's Polaris theme.
// Listens for `data-polaris-theme` attribute changes on <html>.
// =============================================================================

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-polaris-theme");
  return attr === "dark" ? "dark" : "light";
}

export function useTheme(): {
  theme: Theme;
  isDark: boolean;
} {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(readTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-polaris-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return { theme, isDark: theme === "dark" };
}

/** Returns the correct logo URL based on the active theme (Section 64). */
export function useLogoUrl(lightUrl: string, darkUrl: string): string {
  const { isDark } = useTheme();
  return isDark ? darkUrl : lightUrl;
}
