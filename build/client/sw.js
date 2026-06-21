/* =============================================================================
 * VANTA OS — Service Worker (Section 77)
 * Strategy:
 *   - Static assets (JS/CSS/fonts/icons): cache-first
 *   - API calls (network-first, fallback to cache when offline — Section 28)
 *   - App shell: precache on install
 * ========================================================================== */

const VERSION = "vanta-os-v1.0.0";
const APP_SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/app",
  "/manifest.json",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET
  if (request.method !== "GET") return;

  // Network-first for API calls (always fresh data; offline fallback)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? new Response(
          JSON.stringify({ error: "offline", message: "You are offline. Cloud tasks continue running." }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ))),
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      return res;
    })),
  );
});
