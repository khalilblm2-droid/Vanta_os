// =============================================================================
// VANTA OS — Help & Support (Section 9.9, Section 63)
// Contact method, documentation link, FAQ, changelog (from CHANGELOG.md).
// =============================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Mail, BookOpen, HelpCircle } from "lucide-react";
import { requireAdmin } from "~/lib/shopify/auth-context.server";
import { getSecurityHeaders } from "~/lib/security/headers";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";
import { APP_IDENTITY } from "~/lib/shopify/constants";
import { MarkdownRenderer } from "~/components/ui/MarkdownRenderer";
import { useTranslation, type Locale } from "~/lib/i18n/useTranslation";

export async function loader(args: LoaderFunctionArgs) {
  const ctx = await requireAdmin(args);
  const wl = getWhitelabelConfig();

  // Read CHANGELOG.md (Section 63)
  let changelog = "";
  try {
    changelog = readFileSync(path.resolve(process.cwd(), "CHANGELOG.md"), "utf-8");
  } catch {
    changelog = "Changelog not available.";
  }

  return json({
    locale: ctx.shop.preferredLanguage as Locale,
    appName: wl.appName,
    supportEmail: wl.supportEmail,
    docsUrl: wl.docsUrl,
    copyrightHolder: wl.copyrightHolder,
    version: APP_IDENTITY.VERSION,
    changelog,
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function Help() {
  const data = useLoaderData<typeof loader>();
  const { t } = useTranslation(data.locale);

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: "How does the agent decide what to do?",
      a: "The agent uses Google Gemini to interpret your natural-language command, then calls the appropriate Shopify Admin GraphQL API operations. Before any bulk action, it shows you a blast-radius estimate and waits for your approval.",
    },
    {
      q: "Can I undo a change?",
      a: "Yes. Any modifying action records an undo snapshot of the previous state. Completed task cards include an 'Undo' button that reverts the change instantly.",
    },
    {
      q: "What happens if the agent makes a mistake?",
      a: "Use the Kill Switch in Settings to halt all activity immediately. Then review the Task History, undo any unwanted changes, and contact support if needed.",
    },
    {
      q: "Is my data shared with AI providers?",
      a: "Your command text and relevant store data are sent to Google Gemini for inference. We never use your data to train AI models. See the Privacy Policy for full details.",
    },
    {
      q: "What is Guardian Mode?",
      a: "Guardian Mode runs background checks every 6 hours (configurable) to detect $0 prices, low inventory, and broken links. Alerts appear on the Guardian dashboard with one-click fixes.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          {t("help.title")}
        </h1>
        <p className="text-sm text-vanta-muted mt-1">{t("help.subtitle")}</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={data.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition flex items-start gap-3"
        >
          <BookOpen className="h-5 w-5 text-vanta-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{t("help.docs")}</p>
            <p className="text-xs text-vanta-muted mt-1">Full documentation, guides, and API reference.</p>
          </div>
        </a>
        <a
          href={`mailto:${data.supportEmail}`}
          className="vanta-card p-4 hover:border-vanta-400 dark:hover:border-vanta-500 transition flex items-start gap-3"
        >
          <Mail className="h-5 w-5 text-vanta-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{t("help.contact")}</p>
            <p className="text-xs text-vanta-muted mt-1">{data.supportEmail}</p>
          </div>
        </a>
      </div>

      {/* FAQ */}
      <div className="vanta-card p-5">
        <h2 className="font-semibold mb-3">{t("help.faq")}</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i}>
              <p className="text-sm font-medium">{faq.q}</p>
              <p className="text-xs text-vanta-muted mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Changelog (Section 63) */}
      <div>
        <h2 className="font-semibold mb-3">{t("help.changelog")}</h2>
        <div className="vanta-card p-5">
          <MarkdownRenderer content={data.changelog} />
        </div>
      </div>

      {/* Footer with author attribution (Section 18 override) */}
      <div className="text-center text-xs text-vanta-muted pt-6 border-t border-vanta-border">
        <p>{t("help.version", { version: data.version })}</p>
        <p className="mt-1">
          {t("help.copyright", {
            year: new Date().getFullYear(),
            holder: data.copyrightHolder,
          })}
        </p>
      </div>
    </div>
  );
}
