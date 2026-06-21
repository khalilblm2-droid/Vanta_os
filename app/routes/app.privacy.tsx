// =============================================================================
// VANTA OS — Privacy Policy (Section 11, Section 39)
// Real draft content — flagged as draft, requires legal review.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AlertTriangle } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";
import { MarkdownRenderer } from "~/components/ui/MarkdownRenderer";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

export async function loader(args: LoaderFunctionArgs) {
  try {
    const ctx = await requireAdmin(args);
    const wl = getWhitelabelConfig();
    return json({
      locale: ctx.shop.preferredLanguage as Locale,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder,
      shopDomain: ctx.shopDomain,
    });
  } catch {
    // Publicly accessible — fall back to defaults if not authenticated
    const wl = getWhitelabelConfig();
    return json({
      locale: "en" as Locale,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder,
      shopDomain: null,
    });
  }
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function Privacy() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const content = generatePrivacyContent(data.appName, data.supportEmail, data.copyrightHolder);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p className="text-xs">{t("legal.draftNotice")}</p>
      </div>
      <p className="text-xs text-vanta-muted">{t("legal.lastUpdated", { date: "2026-06-20" })}</p>
      <MarkdownRenderer content={content} />
    </div>
  );
}

function generatePrivacyContent(appName: string, supportEmail: string, copyrightHolder: string): string {
  return `# Privacy Policy — ${appName}

**Last updated: 2026-06-20**

${appName} ("we", "us", "our") operates an AI agent application embedded in your Shopify admin. This Privacy Policy explains what data we collect, why we collect it, how long we retain it, and how you can exercise your data protection rights.

## 1. Data We Collect

We collect the minimum data necessary to operate the agent:

- **Shop domain** — to identify your store and scope all queries to your data only.
- **Shopify OAuth access token** — encrypted at rest via the official Prisma session storage adapter. Used only to call the Shopify Admin GraphQL API on your behalf.
- **Staff member identity** — name, email, and Shopify staff ID extracted from the App Bridge session token. Used for audit trail and accountability.
- **Task commands and outputs** — the natural-language commands you submit to the agent, the AI's reasoning trace, and the structured results of executed Shopify mutations.
- **Audit logs** — every Shopify API scope exercised, by which staff member, for which task, at what timestamp.
- **Before/after state snapshots** — for any product, variant, collection, or metafield modified by the agent, we store the previous state to enable one-click undo.
- **Customer or order data** — only if you explicitly grant the \`read_orders\` or \`read_customers\` scopes for a real feature. We never store customer PII beyond what appears in task logs you voluntarily generate by submitting commands that reference customers.
- **Notification and feedback data** — when you submit feedback or receive in-app notifications, we store the content until you delete it.

## 2. Why We Collect This Data

Each data category serves a specific operational purpose:

- **Shop domain + access token** — required to authenticate Shopify Admin API calls on your behalf and to ensure strict multi-tenant isolation (we never execute an unscoped query).
- **Staff identity** — required for multi-staff accountability, so every change can be traced to the specific person who authorized it.
- **Task commands and outputs** — required to execute your requests, render the result in the UI, and answer future questions about past actions (self-documenting knowledge base).
- **Audit logs** — required by Shopify's platform policies and essential for security incident investigation.
- **Undo snapshots** — required to honor the "undo this action" trust feature; deleted automatically 30 days after the task completes.

## 3. AI Sub-Processor Disclosure

${appName} uses **Google Gemini API** as an AI sub-processor. When you submit a command, your command text and relevant store data are sent to Google's API to generate a response. Google's data processing is governed by their own privacy policy and terms of service.

We do not use your data to train AI models. We do not share your data with any third party other than:

1. Google Gemini (for AI inference only)
2. Shopify (via the official Admin API, at your direction)
3. Resend (for transactional email delivery, only if you have email notifications enabled)
4. Sentry (for error tracking, with PII scrubbed)

## 4. Data Retention

- **Active task data** — retained indefinitely while your shop is installed.
- **Undo snapshots** — retained 30 days after task completion, then automatically deleted.
- **Audit logs** — retained 12 months for security and compliance purposes.
- **Rate limit snapshots** — retained 30 days for API health visibility.
- **Processed webhook records** — retained 30 days for idempotency tracking.

## 5. Your Data Protection Rights

Under GDPR (EU), CCPA (California), PIPEDA (Canada), and Law 09-08 (Morocco), you have the right to:

- **Access** your personal data
- **Rectify** inaccurate data
- **Erase** your personal data ("right to be forgotten")
- **Restrict** processing
- **Port** your data to another service
- **Object** to processing

### How to exercise these rights

You have two paths:

1. **Self-service** — Visit the [Data Controls page](/app/data-controls) in ${appName} to export or delete all data we hold about your shop.

2. **Shopify-mediated webhooks** — Shopify sends mandatory GDPR webhooks on your behalf when a customer requests deletion of their data. ${appName} processes these webhooks within 48 hours, permanently deleting all associated PII from our Postgres database and Redis logs.

For any privacy request, contact us at **${supportEmail}**. We respond within 30 days.

## 6. Security Measures

- All Shopify access tokens are encrypted at rest via Shopify's official Prisma session storage adapter.
- All API communication uses HTTPS with strict Content-Security-Policy headers.
- HMAC verification on every incoming webhook.
- AI prompt injection prevention — your commands are sanitized and wrapped in strict system-prompt boundaries before being sent to Gemini.
- Strict multi-tenant scoping — every database query is filtered by \`shopDomain\`. We assert this in code and never execute an unscoped query.
- Daily automated database backups with 30-day retention.

## 7. International Data Transfers

Your data may be processed in the United States (Google Gemini), Canada (our primary infrastructure), or any region where Shopify's data centers operate. We rely on Standard Contractual Clauses and Google's GCP data processing agreement for lawful international transfer.

## 8. Children's Privacy

${appName} does not knowingly collect data from children under 16. Shopify merchants are required to be of legal age to operate a business in their jurisdiction.

## 9. Changes to This Policy

We will notify you of material changes by posting a notification in the ${appName} dashboard and updating the "Last updated" date above.

## 10. Contact

For privacy questions, requests, or concerns:

- Email: **${supportEmail}**
- In-app: Help → Contact Support

© ${new Date().getFullYear()} ${copyrightHolder}. All rights reserved.

---

*This Privacy Policy is provided as a draft for review by your legal counsel. It is not legal advice.*
`;
}
