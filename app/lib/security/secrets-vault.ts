// =============================================================================
// VANTA OS — Encrypted Secrets Vault
// =============================================================================
// This module ensures API keys NEVER appear in plaintext in the codebase.
// Keys are loaded from (in priority order):
//   1. Environment variables (production — set by hosting platform)
//   2. Encrypted vault file (.env.vault — encrypted at rest with AES-256-GCM)
//
// Security guarantees:
//   - Keys never logged (redacted in all log output)
//   - Keys never sent to client (server-only module)
//   - Keys never serialized to JSON responses
//   - Startup validation with clear error messages
//
// FIX: Removed hardcoded SALT — now read from VAULT_SALT env var.
// FIX: Removed unused WHATSAPP/TIKTOK/ALCHEMY secret types.
// FIX: Renamed from "Quantum-Resistant" to accurate "AES-256-GCM encryption at rest".
// =============================================================================

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- Types -------------------------------------------------------------------

// FIX: Removed WHATSAPP_BUSINESS_TOKEN, TIKTOK_SHOP_ACCESS_TOKEN, ALCHEMY_API_KEY
export type SecretKey =
  | "SHOPIFY_API_KEY"
  | "SHOPIFY_API_SECRET"
  | "GEMINI_API_KEY"
  | "ENCRYPTION_KEY"
  | "INTERNAL_DOCS_SECRET"
  | "AGENCY_SECRET"
  | "RESEND_API_KEY"
  | "SENTRY_DSN"
  | "SHOPIFY_PARTNER_API_TOKEN";

interface VaultEntry {
  key: SecretKey;
  value: string;
  rotatedAt?: string;
}

// --- Redaction helper --------------------------------------------------------

const REDACTED = "[REDACTED]";

// FIX: Removed WHATSAPP/TIKTOK/ALCHEMY from default redaction list
export function redactSecrets<T>(obj: T, keys: SecretKey[] = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "GEMINI_API_KEY",
  "ENCRYPTION_KEY",
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

// --- Vault encryption (AES-256-GCM) -----------------------------------------

const VAULT_FILE = resolve(process.cwd(), ".env.vault");

// FIX: Removed hardcoded SALT. Read from VAULT_SALT env var.
// Fails startup with clear error if missing — no insecure fallback.
function getVaultSalt(): Buffer {
  const salt = process.env.VAULT_SALT;
  if (!salt) {
    throw new Error(
      "[VANTA] FATAL: VAULT_SALT environment variable is required. " +
      "Generate one with: openssl rand -hex 16"
    );
  }
  // Accept hex (32 chars = 16 bytes) or base64
  if (/^[0-9a-fA-F]{32}$/.test(salt)) {
    return Buffer.from(salt, "hex");
  }
  return Buffer.from(salt, "base64");
}

function deriveKey(passphrase: string): Buffer {
  const salt = getVaultSalt();
  return scryptSync(passphrase, salt, 32);
}

function encryptVault(entries: VaultEntry[], passphrase: string): Buffer {
  const key = deriveKey(passphrase);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const json = JSON.stringify(entries);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptVault(vaultBuffer: Buffer, passphrase: string): VaultEntry[] {
  const key = deriveKey(passphrase);
  const iv = vaultBuffer.subarray(0, 16);
  const tag = vaultBuffer.subarray(16, 32);
  const encrypted = vaultBuffer.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as VaultEntry[];
}

// --- Public API --------------------------------------------------------------

class SecretsVault {
  private cache = new Map<SecretKey, string>();
  private validated = false;

  load(): void {
    if (this.validated) return;

    const vaultPassphrase = process.env.VAULT_PASSPHRASE;
    if (vaultPassphrase && existsSync(VAULT_FILE)) {
      try {
        const vaultBuffer = readFileSync(VAULT_FILE);
        const entries = decryptVault(vaultBuffer, vaultPassphrase);
        for (const entry of entries) {
          if (!process.env[entry.key]) {
            this.cache.set(entry.key, entry.value);
          }
        }
      } catch (err) {
        console.error("[VANTA] Failed to decrypt .env.vault — ignoring vault");
      }
    }

    const allKeys: SecretKey[] = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "GEMINI_API_KEY",
      "ENCRYPTION_KEY",
      "INTERNAL_DOCS_SECRET",
      "AGENCY_SECRET",
      "RESEND_API_KEY",
      "SENTRY_DSN",
      "SHOPIFY_PARTNER_API_TOKEN",
    ];
    for (const k of allKeys) {
      if (process.env[k]) {
        this.cache.set(k, process.env[k] as string);
      }
    }

    this.validated = true;
  }

  get(key: SecretKey): string {
    this.load();
    const value = this.cache.get(key) ?? process.env[key];
    if (!value || value.trim() === "") {
      throw new Error(
        `[VANTA] Missing required secret: ${key}. Set it as an environment variable on your hosting platform.`
      );
    }
    return value;
  }

  getOptional(key: SecretKey): string | undefined {
    this.load();
    return this.cache.get(key) ?? process.env[key];
  }

  validateRequired(): { valid: boolean; missing: SecretKey[] } {
    this.load();
    const required: SecretKey[] = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "GEMINI_API_KEY",
      "ENCRYPTION_KEY",
      "INTERNAL_DOCS_SECRET",
      "AGENCY_SECRET",
    ];
    const missing: SecretKey[] = [];
    for (const k of required) {
      const v = this.cache.get(k) ?? process.env[k];
      if (!v || v.trim() === "") {
        missing.push(k);
      }
    }
    return { valid: missing.length === 0, missing };
  }

  // FIX: Removed WHATSAPP/TIKTOK/ALCHEMY from createVault key list
  createVault(passphrase: string): void {
    const entries: VaultEntry[] = [];
    const keys: SecretKey[] = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "GEMINI_API_KEY",
      "ENCRYPTION_KEY",
      "INTERNAL_DOCS_SECRET",
      "AGENCY_SECRET",
      "RESEND_API_KEY",
      "SHOPIFY_PARTNER_API_TOKEN",
    ];
    for (const k of keys) {
      const v = process.env[k];
      if (v) {
        entries.push({ key: k, value: v, rotatedAt: new Date().toISOString() });
      }
    }
    const encrypted = encryptVault(entries, passphrase);
    writeFileSync(VAULT_FILE, encrypted);
    console.log(`[VANTA] Encrypted vault created: ${VAULT_FILE} (${entries.length} secrets)`);
  }
}

export const secretsVault = new SecretsVault();

// --- Convenience helpers -----------------------------------------------------

export function getSecret(key: SecretKey): string {
  return secretsVault.get(key);
}

export function getOptionalSecret(key: SecretKey): string | undefined {
  return secretsVault.getOptional(key);
}

export function validateSecrets(): { valid: boolean; missing: SecretKey[] } {
  return secretsVault.validateRequired();
}
