// =============================================================================
// VANTA OS — Root Index Route
// CRITICAL: Without this route, visiting "/" returns 404 → blank screen.
// Shopify redirects to /?shop=... after OAuth. This route must exist.
// It redirects to /app (the authenticated dashboard).
// =============================================================================

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader(_: LoaderFunctionArgs) {
  // Redirect to the app dashboard.
  // The /app route's loader will handle auth: if not authenticated,
  // it redirects to /auth/login which triggers the OAuth flow.
  return redirect("/app");
}

export default function Index() {
  return null;
}
