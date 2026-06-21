import { g as getSecret, p as prisma, l as logger } from "./server-build-BZO8iW4T.js";
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "node:crypto";
import "react/jsx-runtime";
import "node:stream";
import "@remix-run/node";
import "@remix-run/react";
import "isbot";
import "react-dom/server";
import "zod";
import "node:fs";
import "node:path";
import "@shopify/shopify-app-remix/adapters/node";
import "@shopify/shopify-app-remix/server";
import "@shopify/shopify-app-session-storage-prisma";
import "@shopify/shopify-api";
import "@prisma/client";
import "bullmq";
import "ioredis";
import "lucide-react";
import "react";
import "framer-motion";
import "clsx";
import "tailwind-merge";
import "react-markdown";
import "remark-gfm";
import "@shopify/polaris";
import "@shopify/polaris-icons";
const KEY_LEN = 32;
function getStableSalt() {
  const envSalt = process.env.ENCRYPTION_SALT;
  if (envSalt) {
    if (/^[0-9a-fA-F]{32}$/.test(envSalt)) {
      return Buffer.from(envSalt, "hex");
    }
    return Buffer.from(envSalt, "base64");
  }
  throw new Error("[VANTA] FATAL: ENCRYPTION_SALT environment variable is required in production. Generate with: openssl rand -hex 16");
}
const SALT = getStableSalt();
function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, KEY_LEN, { N: 2 ** 16, r: 8, p: 1 });
}
function encrypt(plaintext) {
  const key = deriveKey(getSecret("ENCRYPTION_KEY"), SALT);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}
function decrypt(ciphertextB64) {
  const key = deriveKey(getSecret("ENCRYPTION_KEY"), SALT);
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const encrypted = buf.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
async function connectAccount(shopDomain, staffId, accountType, accountName, credentials, scopes = []) {
  if (!credentials.apiKey || credentials.apiKey.trim() === "") {
    throw new Error("API key is required. Email/password credential storage is not supported.");
  }
  const encrypted = encrypt(JSON.stringify(credentials));
  const account = await prisma.connectedAccount.create({
    data: {
      shopDomain,
      staffId,
      accountType,
      accountName,
      encryptedCredentials: encrypted,
      status: "PENDING",
      scopes,
      authorizedBy: staffId,
      authorizedAt: /* @__PURE__ */ new Date()
    }
  });
  logger.info("Account connected", { shopDomain, accountType, accountName, accountId: account.id });
  return account.id;
}
async function getAccountCredentials(shopDomain, accountId) {
  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, shopDomain, status: { in: ["CONNECTED", "PENDING"] } },
    select: { encryptedCredentials: true }
  });
  if (!account) throw new Error("Account not found or not authorized");
  const decrypted = decrypt(account.encryptedCredentials);
  return JSON.parse(decrypted);
}
async function listConnectedAccounts(shopDomain) {
  const accounts = await prisma.connectedAccount.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" }
  });
  return accounts.map((a) => ({
    id: a.id,
    accountType: a.accountType,
    accountName: a.accountName,
    status: a.status,
    scopes: a.scopes,
    lastVerifiedAt: a.lastVerifiedAt?.toISOString() ?? null,
    lastError: a.lastError,
    authorizedAt: a.authorizedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString()
  }));
}
async function verifyAccount(shopDomain, accountId) {
  const account = await prisma.connectedAccount.findFirst({ where: { id: accountId, shopDomain } });
  if (!account) return { valid: false, error: "Account not found" };
  try {
    const creds = await getAccountCredentials(shopDomain, accountId);
    if (!creds?.apiKey) throw new Error("Missing API key");
    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: { status: "CONNECTED", lastVerifiedAt: /* @__PURE__ */ new Date(), lastError: null }
    });
    return { valid: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: { status: "ERROR", lastError: errorMsg }
    });
    return { valid: false, error: errorMsg };
  }
}
async function revokeAccount(shopDomain, accountId) {
  await prisma.connectedAccount.delete({ where: { id: accountId } });
  logger.info("Account revoked", { shopDomain, accountId });
}
export {
  connectAccount,
  getAccountCredentials,
  listConnectedAccounts,
  revokeAccount,
  verifyAccount
};
//# sourceMappingURL=connected-accounts.server-SVYmzeSn.js.map
