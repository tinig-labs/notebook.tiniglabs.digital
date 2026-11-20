/// <reference lib="webworker" />
/**
 * Offline shell for the notebook. Precaches the app pages and every hashed build asset, so the
 * app opens with no signal. Patient data is never cached here: it lives encrypted in IndexedDB,
 * and /api is always network-only.
 *
 * Built by scripts/build-sw.mjs, which replaces the two constants below.
 */
declare const self: ServiceWorkerGlobalScope;
declare const __PRECACHE__: string[];
declare const __VERSION__: string;

const SHELL = `notebook-shell-${__VERSION__}`;
const PAGES = ["/", "/app", "/app/patient", "/app/record", "/app/recording", "/app/labels", "/app/library", "/app/settings", "/sign-in", "/privacy", "/terms"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(__PRECACHE__);
      // Pages individually: one failing page must not block the install.
      await Promise.all(PAGES.map((p) => cache.add(new Request(p, { cache: "reload" })).catch(() => {})));
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("notebook-shell-") && k !== SHELL) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

const pageKey = (url: URL) => {
  const p = url.pathname.replace(/\/$/, "") || "/";
  return PAGES.includes(p) ? p : null;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // Pages: network first (fresh deploys), cached shell when offline. Query strings (?id=) share one shell.
  if (req.mode === "navigate") {
    const key = pageKey(url);
    e.respondWith(
      (async () => {
        try {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 4000);
          const res = await fetch(req, { signal: ctl.signal });
          clearTimeout(t);
          if (res.ok && key && !res.redirected) void caches.open(SHELL).then((c) => c.put(key, res.clone()));
          return res;
        } catch {
          const cache = await caches.open(SHELL);
          return (key && (await cache.match(key))) || (await cache.match("/app")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed build assets and static files: cache first.
  if (url.pathname.startsWith("/_next/static/") || /\.(?:js|css|woff2?|svg|png|ico|webmanifest)$/.test(url.pathname) || url.pathname.startsWith("/worklets/")) {
    e.respondWith(
      (async () => {
        const cache = await caches.open(SHELL);
        const hit = await cache.match(req, { ignoreSearch: url.pathname.startsWith("/_next/static/") });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) void cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // RSC payloads for client-side navigation: network, falling back to cache.
  if (url.searchParams.has("_rsc") || req.headers.get("RSC") === "1") {
    e.respondWith(fetch(req).catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()));
  }
});
