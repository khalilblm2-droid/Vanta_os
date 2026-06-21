// =============================================================================
// VANTA OS — Email Service (Section 56)
// Transactional email via Resend's official SDK.
// Used for: task completion summaries, Guardian alerts, billing events.
// =============================================================================

import { Resend } from "resend";
import { loadEnv } from "~/lib/env.server";
import { logger } from "~/lib/logger.server";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";

let _client: Resend | null = null;

function getClient(): Resend | null {
  if (!loadEnv().RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured — emails will be skipped");
    return null;
  }
  if (_client) return _client;
  _client = new Resend(loadEnv().RESEND_API_KEY);
  return _client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional reply-to address (defaults to support email). */
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  const wl = getWhitelabelConfig();
  try {
    const { data, error } = await client.emails.send({
      from: loadEnv().EMAIL_FROM,
      to: input.to,
      subject: `[${wl.appName}] ${input.subject}`,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo ?? wl.supportEmail,
    });
    if (error) {
      logger.error("Email send failed", { to: input.to, error: error.message });
      return false;
    }
    logger.info("Email sent", { to: input.to, subject: input.subject, id: data?.id });
    return true;
  } catch (err) {
    logger.error("Email send threw", { to: input.to, error: String(err) });
    return false;
  }
}

// --- Pre-built templates -----------------------------------------------------

export async function sendTaskCompleteEmail(opts: {
  to: string;
  shopDomain: string;
  taskId: string;
  command: string;
  summary: string;
  deepLink?: string;
}): Promise<boolean> {
  const wl = getWhitelabelConfig();
  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #7c5cff; font-size: 22px; font-weight: 700; letter-spacing: 1px; margin: 0;">${wl.appName}</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Task Complete</p>
      </div>
      <p style="color: #1e293b; font-size: 15px; line-height: 1.6;">Your agent has finished a task on <strong>${opts.shopDomain}</strong>.</p>
      <div style="background: #f8fafc; border-left: 3px solid #7c5cff; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Command</p>
        <p style="margin: 0; font-size: 14px; color: #1e293b;">${escapeHtml(opts.command)}</p>
      </div>
      <div style="margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Summary</p>
        <p style="margin: 0; font-size: 14px; color: #1e293b; line-height: 1.6;">${escapeHtml(opts.summary)}</p>
      </div>
      ${
        opts.deepLink
          ? `<a href="${opts.deepLink}" style="display: inline-block; background: #7c5cff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">View Full Report</a>`
          : ""
      }
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
        Sent by ${wl.appName}. If you no longer wish to receive these emails,
        disable "Email notifications" in your Settings page.<br/>
        &copy; ${new Date().getFullYear()} ${wl.copyrightHolder}. All rights reserved.
      </p>
    </div>
  `;
  return sendEmail({
    to: opts.to,
    subject: "Task complete",
    html,
    text: `Task complete on ${opts.shopDomain}.\n\nCommand: ${opts.command}\n\nSummary: ${opts.summary}\n\nView report: ${opts.deepLink ?? "(no link)"}`,
  });
}

export async function sendGuardianAlertEmail(opts: {
  to: string;
  shopDomain: string;
  alertTitle: string;
  alertDescription: string;
  fixUrl?: string;
}): Promise<boolean> {
  const wl = getWhitelabelConfig();
  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #ef4444; font-size: 22px; font-weight: 700; margin: 0;">⚠️ ${wl.appName} Guardian Alert</h1>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">${opts.shopDomain}</p>
      </div>
      <p style="color: #1e293b; font-size: 16px; line-height: 1.6; font-weight: 600;">${escapeHtml(opts.alertTitle)}</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">${escapeHtml(opts.alertDescription)}</p>
      ${
        opts.fixUrl
          ? `<a href="${opts.fixUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">Fix Now</a>`
          : ""
      }
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="color: #94a3b8; font-size: 12px;">Sent by ${wl.appName} Guardian Mode. &copy; ${new Date().getFullYear()} ${wl.copyrightHolder}.</p>
    </div>
  `;
  return sendEmail({
    to: opts.to,
    subject: `Guardian Alert: ${opts.alertTitle}`,
    html,
    text: `Guardian Alert on ${opts.shopDomain}.\n\n${opts.alertTitle}\n\n${opts.alertDescription}\n\nFix: ${opts.fixUrl ?? "(no link)"}`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
