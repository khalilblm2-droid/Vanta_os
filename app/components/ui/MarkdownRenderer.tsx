// =============================================================================
// VANTA OS — Markdown Renderer (Section 26)
// GitHub-flavored Markdown with deep-link support.
// Tables, code blocks, blockquotes, links — all rendered cleanly.
// Actionable deep links to Shopify Admin get a special "external" treatment.
// =============================================================================

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { cn } from "~/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:font-semibold prose-headings:text-vanta-900 dark:prose-headings:text-vanta-50",
        "prose-p:text-vanta-700 dark:prose-p:text-vanta-200",
        "prose-a:text-vanta-600 dark:prose-a:text-vanta-300 prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-vanta-100 dark:prose-code:bg-vanta-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-vanta-950 prose-pre:text-vanta-50 prose-pre:rounded-lg prose-pre:overflow-x-auto",
        "prose-table:border prose-table:border-vanta-200 dark:prose-table:border-vanta-700",
        "prose-th:border prose-th:border-vanta-200 dark:prose-th:border-vanta-700 prose-th:bg-vanta-50 dark:prose-th:bg-vanta-800 prose-th:px-3 prose-th:py-2 prose-th:text-left",
        "prose-td:border prose-td:border-vanta-200 dark:prose-td:border-vanta-700 prose-td:px-3 prose-td:py-2",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const isShopifyAdmin =
              href && (href.includes("myshopify.com/admin") || href.includes("/admin/"));
            const isExternal = href && (href.startsWith("http") || href.startsWith("https"));
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={
                  isShopifyAdmin
                    ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-vanta-100 dark:bg-vanta-800 text-vanta-700 dark:text-vanta-200 hover:bg-vanta-200 dark:hover:bg-vanta-700 transition"
                    : ""
                }
              >
                {children}
                {isShopifyAdmin && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
