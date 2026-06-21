// =============================================================================
// VANTA OS — Auth login route
// Delegates to @shopify/shopify-app-remix's authenticate.login() — NO hand-rolled
// token exchange. (Section 5.1)
//
// FIX: For unstable_newEmbeddedAuthStrategy, the login route must be a
// resource route (no default export). The loader handles the entire flow.
// =============================================================================

import type { LoaderFunctionArgs } from "@remix-run/node";
import { shopify } from "~/lib/shopify/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await shopify.authenticate.login(request);
};
