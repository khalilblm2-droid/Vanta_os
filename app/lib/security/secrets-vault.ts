// =============================================================================
// VANTA OS — Secrets Access Layer
// Simple wrapper around process.env for secret values.
// On Render: secrets are set in the Dashboard Environment tab.
// Locally: secrets are in .env (loaded by dotenv, gitignored).
// No encrypted vault files. No hardcoded salts. No complexity.
// =============================================================================

export type SecretKey =
  | "SHOPIFY_API_KEY"
  | "SHOPIFY_API_SECRET"
  | "GEMINI_API_KEY"
  | "ENCRYPTION_KEY"
  | "ENCRYPTION_SALT"
  | "VAULT_SALT"
  | "INTERNAL_DOCS_SECRET"
  | "AGENCY_SECRET"
  | "RESEND_API_KEY"
  | "SENTRY_DSN"
  | "SHOPIFY_PARTNER_API_TOKEN";

const REDACTED = "[REDACTED]";

/** Redact sensitive values from any object before logging/serialization. */
export function redactSecrets<T>(obj: T, keys: SecretKey[] = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "GEMINI_API_KEY",
  "ENCRYPTION_KEY",
  "ENCRYPTION_SALT",
  "VAULT_SALT",
  "INTERNAL_DOCS_SECRET",
  "AGENCY_SECRET",
  "RESEND_API_KEY",
  "SHOPIFY_PARTNER_API_TOKEN",
]): T {
  if (typeof obj !== "object" || obj === null) return obj;
  const cloned = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  for (const k of keys) {
    if (k in cloned && typeof cloned[k] === "string") {
      cloned[k] = REDACTED;
    }
  }
  for (const k of Object.keys(cloned)) {
    if (typeof cloned[k] === "object" && cloned[k] !== null) {
      cloned[k] = redactSecrets(cloned[k], keys) as unknown;
    }
  }
  return cloned as T;
}

/** Get a required secret. Throws if missing. */
export function getSecret(key: SecretKey): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `[VANTA] Missing required secret: ${key}. Set it in your environment variables.`
    );
  }
  return value;
}

/** Get an optional secret. Returns undefined if missing. */
export function getOptionalSecret(key: SecretKey): string | undefined {
  return process.env[key];
}

/** Validate all required secrets at startup. */
export function validateSecrets(): { valid: boolean; missing: SecretKey[] } {
  const required: SecretKey[] = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "GEMINI_API_KEY",
    "ENCRYPTION_KEY",
    "ENCRYPTION_SALT",
    "VAULT_SALT",
    "INTERNAL_DOCS_SECRET",
    "AGENCY_SECRET",
  ];
  const missing: SecretKey[] = [];
  for (const k of required) {
    const v = process.env[k];
    if (!v || v.trim() === "") {
      missing.push(k);
    }
  }
  return { valid: missing.length === 0, missing };
}
