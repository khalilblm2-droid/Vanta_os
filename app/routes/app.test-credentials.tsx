// =============================================================================
// VANTA OS — Test Credentials Page (REQUIRED for Shopify App Store review)
// Shopify reviewers need test credentials to evaluate the app.
// This page provides them with everything they need.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Key, Store, Mail, Shield } from "lucide-react";
import { loadEnv } from "~/lib/env.server";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";
import { getSecurityHeaders } from "~/lib/security/headers";

// This route is public (no auth required) so reviewers can access it
export async function loader(_: LoaderFunctionArgs) {
  const e = loadEnv();
  const wl = getWhitelabelConfig();
  return json({
    appName: wl.appName,
    version: "1.0.0",
    author: wl.copyrightHolder,
    supportEmail: wl.supportEmail,
    appUrl: e.APP_URL,
    apiVersion: e.SHOPIFY_API_VERSION,
    // Test store for reviewers
    testStoreUrl: "vanta-os-test.myshopify.com",
    // Test staff account on the test store
    testStaffEmail: "reviewer@vanta-os-test.myshopify.com",
    testStaffPassword: "VantaReview2026!",
    // Scopes the app requests
    requestedScopes: e.SHOPIFY_APP_SCOPES.split(",").map((s) => s.trim()),
    // Features to test
    features: [
      "Agent Canvas — submit natural language commands",
      "Task Cards — watch real-time state animations",
      "Goals & Plans — create goals and let AI plan execution",
      "Autonomous Agents — 7 AI agents running 24/7",
      "Predictive Commerce — demand forecasting",
      "Guardian Mode — proactive store monitoring",
      "Knowledge Base — ask 'why did you do X?'",
      "Settings — permission guardrails, kill switch, persona",
      "Multi-language — English + Moroccan Arabic (RTL)",
      "Dark/Light theme sync with Shopify Admin",
    ],
    // GDPR compliance
    compliance: {
      webhooks: [
        "customers/redact",
        "customers/data_request",
        "shop/redact",
        "app/uninstalled",
        "app/scopes_update",
      ],
      dataDeletionWindow: "48 hours (well within Shopify's requirement)",
      privacyPolicyUrl: "/app/privacy",
      termsOfServiceUrl: "/app/terms",
    },
  });
}

export function headers(_: HeadersArgs) {
  return getSecurityHeaders();
}

export default function TestCredentials() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, sans-serif", color: "#1a2238" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#7c5cff", margin: 0 }}>
          {data.appName} — Reviewer Access
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
          Version {data.version} · by {data.author}
        </p>
      </div>

      {/* Installation */}
      <div style={{ background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem" }}>
          <Store size={20} /> Test Store Access
        </h2>
        <div style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
          <p><strong>Test Store URL:</strong> {data.testStoreUrl}</p>
          <p><strong>Staff Email:</strong> {data.testStaffEmail}</p>
          <p><strong>Staff Password:</strong> {data.testStaffPassword}</p>
          <p style={{ marginTop: "0.5rem", color: "#64748b" }}>
            Install the app on this test store to review all features.
          </p>
        </div>
      </div>

      {/* Features to test */}
      <div style={{ background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Features to Test</h2>
        <ul style={{ margin: 0, paddingLeft: "1.5rem", fontSize: "0.875rem", lineHeight: "1.8" }}>
          {data.features.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      </div>

      {/* Requested scopes */}
      <div style={{ background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem" }}>
          <Key size={20} /> Requested OAuth Scopes
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {data.requestedScopes.map((scope) => (
            <span key={scope} style={{ background: "#e0e7ff", color: "#4338ca", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontFamily: "monospace" }}>
              {scope}
            </span>
          ))}
        </div>
      </div>

      {/* GDPR compliance */}
      <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #bbf7d0" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem", color: "#15803d" }}>
          <Shield size={20} /> GDPR Compliance
        </h2>
        <div style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
          <p><strong>Mandatory webhooks:</strong> {data.compliance.webhooks.join(", ")}</p>
          <p><strong>Data deletion window:</strong> {data.compliance.dataDeletionWindow}</p>
          <p><strong>Privacy Policy:</strong> <a href={data.compliance.privacyPolicyUrl}>View Privacy Policy →</a></p>
          <p><strong>Terms of Service:</strong> <a href={data.compliance.termsOfServiceUrl}>View Terms →</a></p>
        </div>
      </div>

      {/* Support */}
      <div style={{ background: "#f5f7fa", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "1rem" }}>
          <Mail size={20} /> Developer Contact
        </h2>
        <div style={{ fontSize: "0.875rem" }}>
          <p><strong>Support Email:</strong> {data.supportEmail}</p>
          <p><strong>API Version:</strong> {data.apiVersion}</p>
          <p><strong>Response time:</strong> Within 24 hours</p>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", marginTop: "2rem" }}>
        © 2026 {data.author}. All rights reserved.
      </p>
    </div>
  );
}
