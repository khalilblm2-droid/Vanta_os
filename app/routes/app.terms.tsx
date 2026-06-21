// =============================================================================
// VANTA OS — Terms of Service (Section 11)
// Real draft content covering what the agent is/isn't authorized to do,
// billing terms, and liability for an automated agent.
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
    });
  } catch {
    const wl = getWhitelabelConfig();
    return json({
      locale: "en" as Locale,
      appName: wl.appName,
      supportEmail: wl.supportEmail,
      copyrightHolder: wl.copyrightHolder,
    });
  }
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function Terms() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);
  const content = generateTermsContent(data.appName, data.supportEmail, data.copyrightHolder);

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

function generateTermsContent(appName: string, supportEmail: string, copyrightHolder: string): string {
  return `# Terms of Service — ${appName}

**Last updated: 2026-06-20**

These Terms of Service ("Terms") govern your use of ${appName} ("the Service"), an AI agent application embedded in your Shopify admin. By installing or using the Service, you agree to these Terms.

## 1. What the Agent Is Authorized to Do

When you grant the requested Shopify access scopes, ${appName} is authorized to:

- **Read and write products, variants, collections, and metafields** — within the scopes you explicitly grant and the permissions you configure in Settings.
- **Adjust inventory levels** — only if you enable the inventory write permission.
- **Read orders and customers** — only if you explicitly grant those scopes for a real feature.
- **Generate AI-drafted content** — SEO descriptions, marketing copy, summaries.

Every action is logged with the staff member who initiated it, the timestamp, and the before/after state. You can undo any modifying action within 30 days.

## 2. What the Agent Is NOT Authorized to Do

The agent will NEVER:

- **Access payment gateway, payout, or financial settings** — if a request involves these, the agent will generate a deep link to the relevant Shopify Admin page and instruct you to perform the action manually.
- **Process refunds outside the original payment processor** — refunds must go through Shopify's native refund flow.
- **Log into third-party platforms (suppliers, marketplaces) using stored credentials via browser automation** — if supplier-sourcing becomes a feature, it will use the platform's official API or a CSV you upload, never browser automation with stored passwords.
- **Bypass Shopify checkout** — the agent respects Shopify's checkout flow completely.
- **Operate outside the permission guardrails you configure** — even if a command requests a disallowed action, the agent will refuse and explain why.

## 3. Approval and Blast-Radius Safeguards

For any bulk or irreversible action (default threshold: 10+ items), the agent:

1. Performs a "dry run" to calculate the exact scope of the change.
2. Presents a precise warning: "This action will modify N items."
3. Waits for your explicit approval before executing.

You can adjust the threshold or disable approval entirely in Settings. Doing so is at your own risk.

## 4. Billing Terms

${appName} uses **Shopify App Pricing** for billing. Plans and credit allocations are defined in the Shopify Partner Dashboard and managed by Shopify directly.

- **Free plan** — limited monthly credits for evaluation.
- **Growth plan** — higher credit allocation for active stores.
- **Pro plan** — maximum credits for high-volume operations.
- **Private test plan** — $0 plan for development and QA, always available.

Credits are consumed per completed task based on AI inference cost + Shopify API operations. Usage is reported to Shopify via the App Events API for metering and invoicing.

You can cancel at any time by uninstalling the app from your Shopify admin. Cancellation takes effect immediately and no further charges accrue.

## 5. Kill Switch

You have a "Disable Agent Globally" toggle in Settings. When enabled, the agent aborts all pending tasks, rejects new commands, and refuses to execute any Shopify mutation. This is your emergency brake.

## 6. Data and Privacy

Our handling of your data is described in detail in our [Privacy Policy](/app/privacy). Key commitments:

- We never share your data with third parties other than the AI sub-processor (Google Gemini), Shopify itself, and email/telemetry providers (Resend, Sentry) — all with strict data processing agreements.
- We never use your data to train AI models.
- You can export or delete all your data at any time via the Data Controls page.
- Shopify-mediated GDPR webhooks (customer redaction, data request, shop redaction) are processed within 48 hours.

## 7. Acceptable Use

You agree NOT to:

- Submit commands that attempt prompt injection, jailbreaks, or attempts to override the agent's guardrails.
- Use the agent to perform actions that violate Shopify's Acceptable Use Policy.
- Resell or sublicense access to the agent without written permission.
- Attempt to access data belonging to other shops (we enforce multi-tenant isolation in code, but you agree not to attempt to circumvent it).

## 8. Service Availability

We target 99.9% uptime for the web application and worker process. We are not liable for:

- Outages caused by Shopify, Google Gemini, or other third-party providers.
- Data loss caused by your failure to maintain Shopify admin access.
- Delays caused by Shopify API rate limits.

## 9. Intellectual Property

${appName}, including its source code, UI design, brand assets, and documentation, is the exclusive property of **${copyrightHolder}**. You receive a limited, revocable, non-transferable license to use the Service for the duration of your subscription.

## 10. Disclaimer of Warranties

THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. The agent uses artificial intelligence to interpret natural-language commands, and AI can misinterpret intent. You are responsible for reviewing proposed actions before approval and for verifying completed actions. We do not warrant that the agent will be error-free, uninterrupted, or fit for any particular purpose.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${copyrightHolder} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS OPPORTUNITY, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.

Total liability for any claim shall not exceed the amount you paid to ${appName} in the 12 months preceding the claim.

## 12. Indemnification

You agree to indemnify and hold harmless ${copyrightHolder} from any claim arising from:

- Actions taken by the agent at your direction.
- Your violation of these Terms or Shopify's policies.
- Your infringement of third-party intellectual property rights.

## 13. Termination

You can terminate these Terms at any time by uninstalling ${appName} from your Shopify admin. Upon termination:

- All pending tasks are cancelled.
- All Shopify sessions are revoked.
- Your data is retained for 48 hours to allow you to export it, then permanently deleted (unless retention is required by law).

## 14. Governing Law

These Terms are governed by the laws of the jurisdiction where ${copyrightHolder} operates, without regard to conflict-of-laws principles. Disputes will be resolved in the courts of that jurisdiction.

## 15. Changes to These Terms

We may update these Terms from time to time. Material changes will be notified via in-app notification and email. Continued use after the effective date constitutes acceptance of the revised Terms.

## 16. Contact

For questions about these Terms:

- Email: **${supportEmail}**
- In-app: Help → Contact Support

© ${new Date().getFullYear()} ${copyrightHolder}. All rights reserved.

---

*These Terms of Service are provided as a draft for review by your legal counsel. They are not legal advice.*
`;
}
