import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { getLoadContext } from "./app/load-context";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      getLoadContext,
    }),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3000,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@shopify/polaris", "framer-motion", "lucide-react"],
  },
});
