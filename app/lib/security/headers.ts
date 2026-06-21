// =============================================================================
// VANTA OS — Content Security Policy & Security Headers (Section 74)
// - frame-ancestors: *.myshopify.com + admin.shopify.com (required for embedded apps)
// - Script sources: own domain + Shopify CDN only
// - Strict HTTPS, HSTS, no-sniff, referrer policy
// =============================================================================

import type { HeadersInit } from "@remix-run/node";
import { loadEnv } from "~/lib/env.server";

/**
 * Build the CSP string for the current environment.
 * `appOrigin` is the public URL of the VANTA OS app server.
 *
 * scripts for hydration data. Without this, the browser blocks the
 * inline script and React never hydrates → blank screen.
 *
 *
 */
export function buildCspHeader(appOrigin: string, isDev: boolean = false): string {
  const directives = [
    "default-src 'self'",
    // Frame-ancestors — required for Shopify embedded apps (Section 74)
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
    // Script sources — own domain + Shopify CDN (Section 74)
    // 'unsafe-inline' is required for Remix's inline hydration script
    `script-src 'self' 'unsafe-inline' https://cdn.shopify.com ${appOrigin}${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles — Polaris + our own + inline (Remix injects inline styles)
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    // Images — Shopify CDN + own + data URIs
    "img-src 'self' data: blob: https: https://cdn.shopify.com",
    // Connect — Shopify APIs + own backend + Gemini (server-side only)
    `connect-src 'self' ${appOrigin} https://*.shopify.com https://*.myshopify.com`,
    // Fonts
    "font-src 'self' data: https://cdn.shopify.com",
    // Object-src — block all plugins
    "object-src 'none'",
    // Base-uri — restrict
    "base-uri 'self'",
    // Form-action — Shopify + own
    "form-action 'self' https://*.shopify.com",
    // No mixed content
    "block-all-mixed-content",
    // Upgrade insecure requests
    "upgrade-insecure-requests",
  ];
  return directives.join("; ");
}

/**
 * Security headers applied to every response (Section 13, Section 74).
 */
export function getSecurityHeaders(): Record<string, string> {
  const e = loadEnv();
  const isDev = e.APP_ENV === "development" || process.env.NODE_ENV !== "production";
  return {
    "Content-Security-Policy": buildCspHeader(e.APP_URL, isDev),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    // The actual framing is controlled by CSP frame-ancestors above.
    "X-Frame-Options": "ALLOWALL",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "X-XSS-Protection": "1; mode=block",
  };
}

/** Convenience: HeadersInit for Remix loaders/actions. */
export function securityHeadersInit(): HeadersInit {
  return getSecurityHeaders();
}
