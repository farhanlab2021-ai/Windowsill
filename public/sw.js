/*
 * Windowsill's service worker: makes the app open and work with no internet.
 *
 * A service worker is a small script the browser runs in the background. It
 * sits between the app and the network and can answer requests from a cache.
 * Your notes don't go through here at all: they live in IndexedDB on the
 * device. This only stores the app itself (pages, code, fonts, icons).
 *
 * Strategies:
 *  - Pages (/, /focus): network first, so you always get the latest version
 *    when online; the saved copy when offline.
 *  - Build files (/_next/static/…): their names change whenever their content
 *    changes, so a saved copy is always right — cache first.
 *  - Everything else on this site (icons, emoji data, sounds): use the saved copy
 *    and refresh it in the background.
 *  - Videos are not cached (too big); offline, Focus Mode shows the drawn scene.
 *
 * To force everyone onto a fresh cache, change VERSION.
 */
const VERSION = "windowsill-v3";
const PAGES = ["/", "/focus"];
const PRECACHE = [
  "/manifest.webmanifest",
  "/media-manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/emoji/en/data.json",
  "/emoji/en/messages.json",
  "/pdfjs/pdf.worker.min.mjs", // lets PDF import work offline
];

/** Finds the build files a page needs, by reading its HTML. */
function assetsIn(html) {
  return [...html.matchAll(/["'](\/_next\/static\/[^"'?#\s]+)/g)].map((m) => m[1]);
}

async function cacheUrls(urls) {
  const cache = await caches.open(VERSION);
  await Promise.all(
    [...new Set(urls)].map((url) =>
      cache.add(url).catch(() => {
        /* one missing file shouldn't stop the rest */
      }),
    ),
  );
}

/** Downloads the latest version of every page and the build files they use. */
async function refreshShell() {
  const cache = await caches.open(VERSION);
  const assets = [];
  for (const page of PAGES) {
    const res = await fetch(page, { cache: "reload" });
    if (!res.ok) continue;
    await cache.put(page, res.clone());
    assets.push(...assetsIn(await res.text()));
  }
  await cacheUrls([...PRECACHE, ...assets]);
}

// After an update is deployed, the next online visit refreshes *all* pages in
// the background (not just the one you opened), at most every 10 minutes.
let lastRefresh = 0;
function maybeRefreshShell() {
  if (Date.now() - lastRefresh < 10 * 60 * 1000) return Promise.resolve();
  lastRefresh = Date.now();
  return refreshShell().catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await refreshShell();
      lastRefresh = Date.now();
      await self.skipWaiting(); // start working straight away
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete caches from older versions.
      for (const key of await caches.keys()) if (key !== VERSION) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The app sends us the files it has already loaded (e.g. the editor's code),
// so they're available offline too.
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(cacheUrls(event.data.urls.filter((u) => typeof u === "string" && u.startsWith("/"))));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // only our own site
  if (request.headers.has("range") || url.pathname.startsWith("/scenes/")) return; // videos

  // Page navigations: network first, saved page as a fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const key = PAGES.includes(url.pathname) ? url.pathname : "/";
        try {
          const res = await fetch(request);
          if (res.ok && PAGES.includes(url.pathname)) {
            await (await caches.open(VERSION)).put(key, res.clone());
            const refreshing = maybeRefreshShell();
            try {
              event.waitUntil(refreshing); // keep the worker alive until it's done
            } catch {
              // some browsers only allow waitUntil earlier; the refresh still runs
            }
          }
          return res;
        } catch {
          return (await caches.match(key)) ?? (await caches.match("/")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Next.js page data for in-app navigation: network only. If it fails, Next.js
  // falls back to a full navigation, which the handler above serves offline.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  // Build files: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) (await caches.open(VERSION)).put(request, res.clone());
        return res;
      })(),
    );
    return;
  }

  // Everything else: saved copy now, refreshed in the background.
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request);
      const refresh = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => undefined);
      return cached ?? (await refresh) ?? Response.error();
    })(),
  );
});

// Tapping a timer notification brings the app to the front.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows[0]) return windows[0].focus();
      return self.clients.openWindow("/");
    })(),
  );
});
