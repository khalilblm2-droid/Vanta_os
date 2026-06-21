// =============================================================================
// VANTA OS — Environment loader
// All config + secrets come from process.env (Render Dashboard or local .env).
// Zod validates everything at startup — fail-fast with clear error messages.
// =============================================================================

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_URL: z.string().url(),
  PORT: z.coerce.number().default(10000),

  // Shopify credentials (required)
  SHOPIFY_API_KEY: z.string().min(1, "SHOPIFY_API_KEY is required"),
  SHOPIFY_API_SECRET: z.string().min(1, "SHOPIFY_API_SECRET is required"),
  SHOPIFY_APP_URL: z.string().url(),
  SHOPIFY_APP_HANDLE: z.string().default("vanta-os"),
  SHOPIFY_API_VERSION: z.string().default("2025-04"),
  SHOPIFY_APP_SCOPES: z.string().min(1),

  // Shopify Partner API (optional)
  SHOPIFY_PARTNER_API_CLIENT_ID: z.string().optional(),
  SHOPIFY_PARTNER_APP_ID: z.string().optional(),

  // Database (required)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BULLMQ_CONCURRENCY: z.coerce.number().default(4),
  BULLMQ_MAX_RETRIES: z.coerce.number().default(3),

  // Gemini (required)
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash-exp"),
  GEMINI_MAX_TOKENS: z.coerce.number().default(8192),
  GEMINI_TEMPERATURE: z.coerce.number().default(0.4),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(60000),

  // Encryption (required)
  ENCRYPTION_KEY: z.string().min(8, "ENCRYPTION_KEY is required"),
  ENCRYPTION_SALT: z.string().min(16, "ENCRYPTION_SALT is required"),
  VAULT_SALT: z.string().min(16, "VAULT_SALT is required"),

  // Internal secrets (required)
  INTERNAL_DOCS_SECRET: z.string().min(8, "INTERNAL_DOCS_SECRET is required"),
  AGENCY_SECRET: z.string().min(8, "AGENCY_SECRET is required"),

  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("VANTA OS <noreply@vanta-os.example.com>"),
  EMAIL_SUPPORT: z.string().default("support@vanta-os.example.com"),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default("development"),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),

  // Whitelabel
  WHITELABEL_MODE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // Feature flags
  FEATURE_AB_TESTING: z.string().transform((v) => v === "true").default("false"),
  FEATURE_GUARDIAN_MODE: z.string().transform((v) => v !== "false").default("true"),
  FEATURE_VOICE_COMMANDS: z.string().transform((v) => v !== "false").default("true"),
  FEATURE_CSV_ENRICHMENT: z.string().transform((v) => v !== "false").default("true"),

  // Rate limit
  SHOPIFY_RATE_LIMIT_PAUSE_THRESHOLD: z.coerce.number().default(0.15),
  SHOPIFY_RATE_LIMIT_RETRY_MAX: z.coerce.number().default(5),
  SHOPIFY_RATE_LIMIT_BACKOFF_BASE_MS: z.coerce.number().default(500),

  // GDPR
  GDPR_DELETION_WINDOW_HOURS: z.coerce.number().default(48),

  // App metadata
  APP_NAME: z.string().default("VANTA OS"),
  APP_VERSION: z.string().default("1.0.0"),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error("\n[VANTA] ❌ Environment configuration errors:\n" + errors + "\n");
    throw new Error(`Environment configuration failed. See errors above.`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Convenience accessor. */
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    return loadEnv()[prop as keyof Env];
  },
});
