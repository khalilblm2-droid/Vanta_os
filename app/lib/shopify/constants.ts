// =============================================================================
// VANTA OS — Shopify Constants (Section 80)
// Single source of truth for API version. NEVER hardcode the version inline.
// When Shopify releases a new quarterly version, change this constant + run
// regression tests — no codebase-wide find-and-replace.
// =============================================================================

export const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_API_VERSION ?? "2025-04";

export const SHOPIFY_API_VERSIONS = {
  CURRENT: SHOPIFY_API_VERSION,
  NEXT: "2025-07",
  PREVIOUS: "2025-01",
} as const;

export const APP_IDENTITY = {
  NAME: "VANTA OS",
  VERSION: "1.0.0",
} as const;

export const BULK_OPERATION_THRESHOLD = 250; // Section 71 — switch to Bulk Operations API above this

export const RATE_LIMIT = {
  // Section 19 — pause execution when available query cost drops below this
  PAUSE_THRESHOLD_RATIO: Number(process.env.SHOPIFY_RATE_LIMIT_PAUSE_THRESHOLD ?? 0.15),
  RETRY_MAX: Number(process.env.SHOPIFY_RATE_LIMIT_RETRY_MAX ?? 5),
  BACKOFF_BASE_MS: Number(process.env.SHOPIFY_RATE_LIMIT_BACKOFF_BASE_MS ?? 500),
} as const;

// File paths — only available in server context (not browser)
// Use getFilePaths() in server-only code instead of importing FILE_PATHS directly
export const FILE_PATHS = {
  get ROOT() { return process.cwd(); },
  get PUBLIC() { return `${process.cwd()}/public`; },
  get ICONS() { return `${process.cwd()}/public/icons`; },
  get DOWNLOADS() { return `${process.cwd()}/public/downloads`; },
} as const;

export const CREDIT_LIMITS = {
  FREE: 100,
  GROWTH: 1000,
  PRO: 10000,
  PRIVATE_TEST: Infinity,
} as const;

export const GDPR = {
  // Section 39 — Shopify requires deletion within 48 hours
  DELETION_WINDOW_HOURS: Number(process.env.GDPR_DELETION_WINDOW_HOURS ?? 48),
} as const;
