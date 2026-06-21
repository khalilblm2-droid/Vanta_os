// =============================================================================
// VANTA OS — /api/openapi.yaml (Section 85)
// Serves the static openapi.yaml file from /public
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { loadEnv } from "~/lib/env.server";

export function headers(_: HeadersArgs) {
  return { "Content-Type": "application/yaml" };
}

export async function loader(args: LoaderFunctionArgs) {
  const e = loadEnv();
  // Same secret protection as /docs
  const authHeader = args.request.headers.get("Authorization");
  const expected = `Bearer ${e.INTERNAL_DOCS_SECRET}`;
  if (!e.INTERNAL_DOCS_SECRET || authHeader !== expected) {
    const url = new URL(args.request.url);
    if (url.searchParams.get("secret") !== e.INTERNAL_DOCS_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }
  // Remix serves /public/openapi.yaml automatically at /openapi.yaml
  // This route just redirects there.
  return new Response(null, {
    status: 302,
    headers: { Location: "/openapi.yaml" },
  });
}
