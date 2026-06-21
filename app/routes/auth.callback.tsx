// =============================================================================
// VANTA OS — Auth callback route
// With unstable_newEmbeddedAuthStrategy, the login route at /auth/login
// handles BOTH the login page AND the OAuth callback.
//
// This route exists as a fallback redirect to /auth/login so that any
// old bookmarked URLs still work.
// =============================================================================

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const target = shop ? `/auth/login?shop=${encodeURIComponent(shop)}` : "/auth/login";
  return redirect(target);
};
