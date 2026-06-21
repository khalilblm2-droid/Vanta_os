// =============================================================================
// VANTA OS — Remix load context
// Passed to all loaders/actions via getLoadContext in vite.config.ts.
// =============================================================================

import type { AppLoadContext } from "@remix-run/node";

export function getLoadContext(): AppLoadContext {
  return {};
}
