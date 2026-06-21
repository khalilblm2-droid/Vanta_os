// =============================================================================
// VANTA OS — Whitelabel Configuration (Section 86)
// When WHITELABEL_MODE=true in env, all UI/email/legal references to "VANTA OS"
// are replaced with the agency's brand. Core codebase is untouched.
// =============================================================================

export interface WhitelabelConfig {
  appName: string;
  tagline: string;
  logoUrl: string;            // light variant
  logoDarkUrl: string;        // dark variant (Section 64)
  faviconIco: string;
  faviconSvg: string;
  faviconPng192: string;      // PWA icon (Section 45, Section 77)
  brandColor: string;         // accent color
  brandColorDark: string;
  supportEmail: string;
  docsUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  copyrightHolder: string;    // legal copyright holder name
}

export const DEFAULT_VANTA_CONFIG: WhitelabelConfig = {
  appName: "VANTA OS",
  tagline: "The Operating System for Your Shopify Store",
  logoUrl: "/icons/vanta-logo-light.svg",
  logoDarkUrl: "/icons/vanta-logo-dark.svg",
  faviconIco: "/icons/favicon.ico",
  faviconSvg: "/icons/favicon.svg",
  faviconPng192: "/icons/icon-192.png",
  brandColor: "#7c5cff",
  brandColorDark: "#a892ff",
  supportEmail: "support@vanta-os.example.com",
  docsUrl: "https://docs.vanta-os.example.com",
  privacyPolicyUrl: "/privacy",
  termsOfServiceUrl: "/terms",
  copyrightHolder: "",
};

/**
 * Active whitelabel config.
 * Override defaults via whitelabel.config.local.ts (gitignored) or env in production.
 */
export function getWhitelabelConfig(): WhitelabelConfig {
  if (process.env.WHITELABEL_MODE !== "true") {
    return DEFAULT_VANTA_CONFIG;
  }

  return {
    ...DEFAULT_VANTA_CONFIG,
    appName: process.env.WL_APP_NAME ?? DEFAULT_VANTA_CONFIG.appName,
    tagline: process.env.WL_TAGLINE ?? DEFAULT_VANTA_CONFIG.tagline,
    logoUrl: process.env.WL_LOGO_URL ?? DEFAULT_VANTA_CONFIG.logoUrl,
    logoDarkUrl: process.env.WL_LOGO_DARK_URL ?? DEFAULT_VANTA_CONFIG.logoDarkUrl,
    faviconIco: process.env.WL_FAVICON_ICO ?? DEFAULT_VANTA_CONFIG.faviconIco,
    faviconSvg: process.env.WL_FAVICON_SVG ?? DEFAULT_VANTA_CONFIG.faviconSvg,
    faviconPng192: process.env.WL_FAVICON_PNG192 ?? DEFAULT_VANTA_CONFIG.faviconPng192,
    brandColor: process.env.WL_BRAND_COLOR ?? DEFAULT_VANTA_CONFIG.brandColor,
    brandColorDark: process.env.WL_BRAND_COLOR_DARK ?? DEFAULT_VANTA_CONFIG.brandColorDark,
    supportEmail: process.env.WL_SUPPORT_EMAIL ?? DEFAULT_VANTA_CONFIG.supportEmail,
    docsUrl: process.env.WL_DOCS_URL ?? DEFAULT_VANTA_CONFIG.docsUrl,
    copyrightHolder: process.env.WL_COPYRIGHT_HOLDER ?? DEFAULT_VANTA_CONFIG.copyrightHolder,
  };
}
