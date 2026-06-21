// =============================================================================
// VANTA OS — AES-256-GCM Encryption Layer (2026)
// Uses AES-256-GCM + scrypt key derivation.
// =============================================================================

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, pbkdf2Sync } from "node:crypto";
import { getSecret } from "~/lib/security/secrets-vault";

const KEY_LEN = 32; // 256-bit

// Read from ENCRYPTION_SALT env var (32-byte hex string).
// In development, use a fixed fallback with a warning.
function getStableSalt(): Buffer {
  const envSalt = process.env.ENCRYPTION_SALT;
  if (envSalt) {
    // Accept hex or base64
    if (/^[0-9a-fA-F]{32}$/.test(envSalt)) {
      return Buffer.from(envSalt, "hex");
    }
    return Buffer.from(envSalt, "base64");
  }
  // Dev fallback — fixed value so data survives restarts in development
  if (false) {
    console.warn("[VANTA] ⚠️ ENCRYPTION_SALT not set — using dev fallback. Set it in production!");
    return Buffer.from("vanta-os-dev-salt-fixed-do-not-use-in-production!!", "utf8").subarray(0, 16);
  }
  throw new Error("[VANTA] FATAL: ENCRYPTION_SALT environment variable is required in production. Generate with: openssl rand -hex 16");
}

const SALT = getStableSalt();

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN, { N: 2 ** 16, r: 8, p: 1 });
}

export function encrypt(plaintext: string): string {
  const key = deriveKey(getSecret("ENCRYPTION_KEY"), SALT);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertextB64: string): string {
  const key = deriveKey(getSecret("ENCRYPTION_KEY"), SALT);
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const encrypted = buf.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function hash(value: string): string {
  const salt = randomBytes(16);
  const h = pbkdf2Sync(value, salt, 100_000, 64, "sha512");
  return `pbkdf2$100000$${salt.toString("base64")}$${h.toString("base64")}`;
}

export function verifyHash(value: string, hashed: string): boolean {
  const [algo, iterStr, saltB64, hashB64] = hashed.split("$");
  if (algo !== "pbkdf2") return false;
  const salt = Buffer.from(saltB64, "base64");
  const expectedHash = Buffer.from(hashB64, "base64");
  const actualHash = pbkdf2Sync(value, salt, parseInt(iterStr), 64, "sha512");
  return expectedHash.equals(actualHash);
}
