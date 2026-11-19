/*
 * Code Dojo service worker: makes the app work with no connection.
 *
 * It is registered in two ways (see components/OfflineStatus.tsx):
 *
 *   /sw.js?v=<build id>&t=<tools version>   a production build
 *     - on install it downloads every page and every file of the app
 *       (the list is /precache.json, written by scripts/build-precache.mjs)
 *     - pages: the network first, the saved copy when the network fails
 *     - files that never change (/_next/static, the editor, the React
 *       bundler): the saved copy first
 *
 *   /sw.js?dev=1                            `npm run dev`
 *     - it leaves every request of the app alone, because the dev server
 *       is on this machine and its files change all the time
 *
 * In both, the React packages that the live preview downloads from a CDN
 * are saved after the first time, so the preview also works offline.
 *
 * tests/sw.test.ts runs this file with a fake cache and a fake network.
 */

const params = new URL(self.location.href).searchParams;
const DEV = params.get("dev") === "1";

/** Pages and /_next/static files. One cache per build. */
const APP_CACHE = "dojo-app-" + (params.get("v") || "dev");
/** The editor and the React bundler. They change only when their packages do. */
const TOOLS_CACHE = "dojo-tools-" + (params.get("t") || "dev");
/** What the live preview downloads from a CDN. Kept across builds. */
const PACKAGES_CACHE = "dojo-packages-v1";

const CDN_HOSTS = ["prod-packager-packages.codesandbox.io", "cdn.jsdelivr.net", "data.jsdelivr.com", "unpkg.com"];

/** How long a page may wait for the network before the saved copy is used. */
const SLOW_NETWORK_MS = 4000;
const PRECACHE_AT_ONCE = 6;

const OFFLINE_PAGE =
  '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Code Dojo</title></head>' +
  '<body style="margin:0;padding:48px 20px;background:#0c0f14;color:#e9edf3;font-family:system-ui,sans-serif;line-height:1.9">' +
  '<h1 style="font-size:22px">مفيش نت، والصفحة دي مش متخزنة</h1>' +
  "<p>الصفحات اللي اتخزنت قبل كده شغالة عادي.</p>" +
  '<p><a href="/" style="color:#f2b84b">ارجع لكل المسائل</a></p></body></html>';

/** The editor and the bundler. The bundler asks for /static/... and /<name>.worker.js. */
function isTool(pathname) {
  return (
    pathname.startsWith("/monaco/") ||
    pathname.startsWith("/sandpack/") ||
    pathname.startsWith("/test-frame/") ||
    pathname.startsWith("/static/") ||
    /^\/[^/]+\.worker\.js$/.test(pathname)
  );
}

/** A CDN address with an exact version in it never changes. */
function isExactVersion(url) {
  return /@\d+\.\d+\.\d+[^/]*(\/|$)/.test(url.pathname) || /\/packages\/.+\/\d+\.\d+\.\d+[^/]*\.json$/.test(url.pathname);
}

function canBeSaved(response) {
  return response.ok || response.type === "opaque";
}

/** Saves a copy without making the page wait for it. */
function save(event, cacheName, key, response) {
  const copy = response.clone();
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.put(key, copy))
      .catch(() => {}),
  );
}

/**
 * A worker script can read its settings from the part of its address after
 * "#", and the app's own worker does. A saved copy remembers the address it
 * was saved under, which has no such part, and the browser would hand that
 * address to the worker. A copy with no address of its own keeps the one
 * that was asked for.
 */
function forWorker(request, response) {
  if (request.destination !== "worker" && request.destination !== "sharedworker") return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function cacheFirst(event, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(event.request, { ignoreVary: true });
  if (saved) return forWorker(event.request, saved);
  const response = await fetch(event.request);
  if (canBeSaved(response)) save(event, cacheName, event.request, response);
  return forWorker(event.request, response);
}

/**
 * The network first. The saved copy is used when the network fails, or when
 * it takes too long and there is a copy to show.
 */
async function networkFirst(event, cacheName, key) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(key, { ignoreVary: true });

  const fromNetwork = fetch(event.request).then((response) => {
    if (canBeSaved(response)) save(event, cacheName, key, response);
    return response;
  });

  if (!saved) return fromNetwork;

  let timer;
  const tooSlow = new Promise((resolve) => {
    timer = setTimeout(() => resolve(saved), SLOW_NETWORK_MS);
  });
  try {
    return await Promise.race([fromNetwork, tooSlow]);
  } catch {
    return saved;
  } finally {
    clearTimeout(timer);
    // If the saved copy won the race, the network answer may still fail later.
    fromNetwork.catch(() => {});
  }
}

async function page(event, url) {
  try {
    return await networkFirst(event, APP_CACHE, url.pathname);
  } catch {
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

/** Downloads everything on the list that is not saved yet. One failure does not stop the rest. */
async function precache() {
  let urls = [];
  try {
    const response = await fetch("/precache.json", { cache: "no-store" });
    const manifest = await response.json();
    if (Array.isArray(manifest.urls)) urls = manifest.urls;
  } catch {
    return;
  }

  const app = await caches.open(APP_CACHE);
  const tools = await caches.open(TOOLS_CACHE);
  let next = 0;

  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      const cache = isTool(url) ? tools : app;
      try {
        if (await cache.match(url)) continue;
        const response = await fetch(url, { cache: "no-cache" });
        if (response.ok) await cache.put(url, response);
      } catch {
        // It will be saved the first time the page asks for it.
      }
    }
  }

  const workers = [];
  for (let i = 0; i < PRECACHE_AT_ONCE; i++) workers.push(worker());
  await Promise.all(workers);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  if (!DEV) event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const old = name.startsWith("dojo-") && name !== APP_CACHE && name !== TOOLS_CACHE && name !== PACKAGES_CACHE;
        if (old) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (!CDN_HOSTS.includes(url.hostname)) return;
    // "Which version is the newest?" must be asked again when online.
    event.respondWith(
      isExactVersion(url) ? cacheFirst(event, PACKAGES_CACHE) : networkFirst(event, PACKAGES_CACHE, request.url),
    );
    return;
  }

  if (DEV) return;

  if (isTool(url.pathname)) {
    event.respondWith(cacheFirst(event, TOOLS_CACHE));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, APP_CACHE));
  } else if (request.mode === "navigate") {
    event.respondWith(page(event, url));
  }
  // Anything else goes to the network as usual. When a page change cannot
  // reach the server, Next loads the whole page, and that is answered above.
});
