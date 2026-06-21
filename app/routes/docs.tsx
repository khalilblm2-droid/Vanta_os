// =============================================================================
// VANTA OS — /docs (Section 85)
// Swagger UI served behind INTERNAL_DOCS_SECRET. Never public.
// =============================================================================

import type { LoaderFunctionArgs, HeadersArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { loadEnv } from "~/lib/env.server";
import { getSecurityHeaders } from "~/lib/security/headers";

export function headers(_: HeadersArgs) {
  return { ...getSecurityHeaders(), "Content-Type": "text/html" };
}

export async function loader(args: LoaderFunctionArgs) {
  const e = loadEnv();
  const authHeader = args.request.headers.get("Authorization");
  const expected = `Bearer ${e.INTERNAL_DOCS_SECRET}`;
  if (!e.INTERNAL_DOCS_SECRET || authHeader !== expected) {
    const url = new URL(args.request.url);
    if (url.searchParams.get("secret") !== e.INTERNAL_DOCS_SECRET) {
      throw new Response("Unauthorized", { status: 401 });
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VANTA OS — API Docs</title>
  <link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; }
    .topbar { background: #7c5cff !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
      });
    };
  </script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
