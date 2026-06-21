// =============================================================================
// VANTA OS — Root component
// - App Bridge script + Provider (Section 5.1 — CRITICAL for Shopify approval)
// - CSP headers (Section 74 — prevents clickjacking rejection)
// - CSS via Vite ?url imports (fixes blank screen)
// - Error boundary with inline styles (works even if CSS fails to load)
// =============================================================================

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
  useLoaderData,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/react";
import { json, type HeadersArgs } from "@remix-run/node";

// CSS via Vite ?url — this is the correct way in Remix + Vite
import tailwindStyles from "~/styles/tailwind.css?url";
import printStyles from "~/styles/print.css?url";

import { getSecurityHeaders } from "~/lib/security/headers";
import { loadEnv } from "~/lib/env.server";
import { getWhitelabelConfig } from "~/lib/whitelabel.config";
import { APP_IDENTITY } from "~/lib/shopify/constants";

export const meta: MetaFunction = () => [
  { title: `${APP_IDENTITY.NAME} — AI Agent for Shopify` },
  { name: "description", content: "The Operating System for Your Shopify Store." },
  { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
  { name: "theme-color", content: "#7c5cff" },
];

export const links: LinksFunction = () => [
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", href: "/icons/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
  { rel: "preconnect", href: "https://cdn.shopify.com" },
  { rel: "stylesheet", href: tailwindStyles },
  { rel: "stylesheet", href: printStyles, media: "print" },
];

export const headers = (_args: HeadersArgs) => getSecurityHeaders();

export async function loader({ request }: LoaderFunctionArgs) {
  const e = loadEnv();
  const wl = getWhitelabelConfig();

  // Extract shop from URL query param (Shopify passes ?shop=xxx in iframe)
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? "";

  return json({
    appName: wl.appName,
    apiKey: e.SHOPIFY_API_KEY,
    appUrl: e.APP_URL,
    shopifyApiVersion: e.SHOPIFY_API_VERSION,
    embedded: true,
    whitelabelMode: e.WHITELABEL_MODE,
    shop, // Pass shop to client for App Bridge initialization
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        {/*
          App Bridge script — MUST be in <head> and MUST NOT be async.
          Shopify requires this for embedded apps. Without it, the app
          cannot communicate with the Shopify Admin iframe and shows
          a blank screen.
        */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return <Outlet />;
}

// --- Error boundary with inline styles (works even if CSS fails) -------------

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";

  return (
    <html lang="en" dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <title>VANTA OS — Error</title>
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif", background: "#f5f7fa", color: "#1a2238" }}>
        <div style={{ maxWidth: "480px", margin: "4rem auto", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
            {message}
          </p>
          <a
            href="/app"
            style={{
              display: "inline-block",
              background: "#7c5cff",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Return to VANTA OS
          </a>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
