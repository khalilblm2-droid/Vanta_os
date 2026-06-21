// Client-safe types + constants for Connected Accounts (no Prisma imports)
// FIX: Removed email-password-based account types (email/password-based).
// Only apiKey-based official API integrations remain.
export type AccountType =
  | "LOGISTICS"
  | "MARKETING";

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

export const SUPPORTED_ACCOUNT_TYPES: Array<{
  type: AccountType;
  label: string;
  description: string;
  requiredFields: string[];
}> = [
  { type: "LOGISTICS", label: "Logistics Platform", description: "Shipping and fulfillment platform integration via official API.", requiredFields: ["apiKey"] },
  { type: "MARKETING", label: "Marketing Platform", description: "Email, social media, or ad platform for marketing automation via official API.", requiredFields: ["apiKey"] },
];
