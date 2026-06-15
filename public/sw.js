// Vaultcube minimal offline shell.
const VERSION = "v1";
const APP_CACHE = `vaultcube-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("vaultcube-") && k !== APP_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth")) return;
  if (url.pathname.startsWith("/api/")) return;

  // NetworkFirst for HTML navigations
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(APP_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(APP_CACHE);
          const cached = (await cache.match(req)) || (await cache.match("/"));
          return cached || new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // CacheFirst for static assets
  if (/\.(?:js|css|woff2?|png|jpg|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(APP_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })()
    );
  }
});
