// =============================================================================
// VANTA OS — Environment loader (Section 13: secrets from vault, never client)
// Uses the encrypted SecretsVault for sensitive values.
// Non-sensitive config (URLs, feature flags) comes from process.env directly.
// =============================================================================

import { z } from "zod";
import { secretsVault, validateSecrets } from "~/lib/security/secrets-vault";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  APP_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),

  // Shopify (non-secret config)
  SHOPIFY_APP_URL: z.string().url(),
  SHOPIFY_APP_HANDLE: z.string().default("vanta-os"),
  SHOPIFY_API_VERSION: z.string().default("2025-04"),
  SHOPIFY_APP_SCOPES: z.string().min(1),

  // Shopify Partner API (optional)
  SHOPIFY_PARTNER_API_CLIENT_ID: z.string().optional(),
  SHOPIFY_PARTNER_APP_ID: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BULLMQ_CONCURRENCY: z.coerce.number().default(4),
  BULLMQ_MAX_RETRIES: z.coerce.number().default(3),

  // Gemini config (non-secret)
  GEMINI_MODEL: z.string().default("gemini-2.0-flash-exp"),
  GEMINI_MAX_TOKENS: z.coerce.number().default(8192),
  GEMINI_TEMPERATURE: z.coerce.number().default(0.4),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(60000),

  // Email
  EMAIL_FROM: z.string().default("VANTA OS <noreply@vanta-os.example.com>"),
  EMAIL_SUPPORT: z.string().default("support@vanta-os.example.com"),

  // Sentry
  SENTRY_ENVIRONMENT: z.string().default("development"),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),

  // Whitelabel
  WHITELABEL_MODE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // Feature flags
  FEATURE_AB_TESTING: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  FEATURE_GUARDIAN_MODE: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  FEATURE_VOICE_COMMANDS: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),
  FEATURE_CSV_ENRICHMENT: z
    .string()
    .transform((v) => v !== "false")
    .default("true"),

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

  // Validate that required secrets exist (fail-fast at startup)
  const secretCheck = validateSecrets();
  if (!secretCheck.valid) {
    console.error("\n[VANTA] ❌ Missing required secrets:");
    for (const k of secretCheck.missing) {
      console.error(`   - ${k}`);
    }
    console.error("\n[VANTA] Set these as environment variables on your hosting platform.");
    console.error("[VANTA] NEVER commit secrets to git.\n");
    // Don't throw in dev — let the app start so devs can see other errors
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required secrets: ${secretCheck.missing.join(", ")}`);
    }
  }

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment configuration:\n${errors}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Get a secret value from the vault. NEVER logs or serializes the value.
 * Use this instead of process.env.SHOPIFY_API_KEY etc.
 */
export function getSecret(key: Parameters<typeof secretsVault.get>[0]): string {
  return secretsVault.get(key);
}

export function getOptionalSecret(key: Parameters<typeof secretsVault.getOptional>[0]): string | undefined {
  return secretsVault.getOptional(key);
}

/** Convenience accessor for non-secret config. */
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    return loadEnv()[prop as keyof Env];
  },
});
