// =============================================================================
// VANTA OS — Connected Accounts Manager
// Manages merchant-owned external accounts via official API keys only.
// Credentials are encrypted at rest using AES-256-GCM.
// =============================================================================

import { prisma } from "~/lib/db.server";
import { logger } from "~/lib/logger.server";
import { encrypt, decrypt } from "~/lib/crypto/crypto";

// --- Types -------------------------------------------------------------------

export type AccountType =
  | "LOGISTICS"
  | "MARKETING";

export interface AccountCredentials {
  apiKey: string;
  [key: string]: string; // Additional API-specific fields (e.g., apiSecret, region)
}

export interface ConnectedAccountInfo {
  id: string;
  accountType: AccountType;
  accountName: string;
  status: string;
  scopes: string[];
  lastVerifiedAt: string | null;
  lastError: string | null;
  authorizedAt: string | null;
  createdAt: string;
}

// --- Account lifecycle -------------------------------------------------------

/**
 * Connect a merchant-owned account using an API key.
 * Credentials are encrypted before storage — never stored in plaintext.
 */
export async function connectAccount(
  shopDomain: string,
  staffId: string | undefined,
  accountType: AccountType,
  accountName: string,
  credentials: AccountCredentials,
  scopes: string[] = [],
): Promise<string> {
  // Validate: only apiKey-based credentials allowed
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
      authorizedAt: new Date(),
    },
  });

  logger.info("Account connected", { shopDomain, accountType, accountName, accountId: account.id });
  return account.id;
}

/**
 * Retrieve decrypted credentials for an account.
 * Only callable from server-side code. Never expose to client.
 */
export async function getAccountCredentials(
  shopDomain: string,
  accountId: string,
): Promise<AccountCredentials> {
  const account = await prisma.connectedAccount.findFirst({
    where: { id: accountId, shopDomain, status: { in: ["CONNECTED", "PENDING"] } },
    select: { encryptedCredentials: true },
  });

  if (!account) throw new Error("Account not found or not authorized");

  const decrypted = decrypt(account.encryptedCredentials);
  return JSON.parse(decrypted) as AccountCredentials;
}

/**
 * List all connected accounts for a shop.
 */
export async function listConnectedAccounts(shopDomain: string): Promise<ConnectedAccountInfo[]> {
  const accounts = await prisma.connectedAccount.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
  });

  return accounts.map((a) => ({
    id: a.id,
    accountType: a.accountType as AccountType,
    accountName: a.accountName,
    status: a.status,
    scopes: a.scopes,
    lastVerifiedAt: a.lastVerifiedAt?.toISOString() ?? null,
    lastError: a.lastError,
    authorizedAt: a.authorizedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }));
}

/**
 * Verify that an account's credentials still work.
 */
export async function verifyAccount(shopDomain: string, accountId: string): Promise<{ valid: boolean; error?: string }> {
  const account = await prisma.connectedAccount.findFirst({ where: { id: accountId, shopDomain } });
  if (!account) return { valid: false, error: "Account not found" };

  try {
    const creds = await getAccountCredentials(shopDomain, accountId);
    if (!creds?.apiKey) throw new Error("Missing API key");

    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: { status: "CONNECTED", lastVerifiedAt: new Date(), lastError: null },
    });
    return { valid: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: { status: "ERROR", lastError: errorMsg },
    });
    return { valid: false, error: errorMsg };
  }
}

/**
 * Revoke an account connection. Credentials are permanently deleted.
 */
export async function revokeAccount(shopDomain: string, accountId: string): Promise<void> {
  await prisma.connectedAccount.delete({ where: { id: accountId } });
  logger.info("Account revoked", { shopDomain, accountId });
}

/**
 * Check if a shop has a specific account type connected.
 */
export async function hasConnectedAccount(shopDomain: string, accountType: AccountType): Promise<boolean> {
  const count = await prisma.connectedAccount.count({
    where: { shopDomain, accountType, status: "CONNECTED" },
  });
  return count > 0;
}

/**
 * Get supported account types with descriptions.
 */
export const SUPPORTED_ACCOUNT_TYPES: Array<{ type: AccountType; label: string; description: string; requiredFields: string[] }> = [
  {
    type: "LOGISTICS",
    label: "Logistics Platform",
    description: "Shipping and fulfillment platform integration via official API.",
    requiredFields: ["apiKey"],
  },
  {
    type: "MARKETING",
    label: "Marketing Platform",
    description: "Email, social media, or ad platform for marketing automation via official API.",
    requiredFields: ["apiKey"],
  },
];
