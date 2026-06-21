// =============================================================================
// VANTA OS — Client Entry (REQUIRED by Remix)
// Handles client-side hydration.
// =============================================================================

import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>,
  );
});
