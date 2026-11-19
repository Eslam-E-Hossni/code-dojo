/**
 * What the page needs to know about the service worker (public/sw.js):
 * how to register it, and how much it has saved so far.
 *
 * The cache names here must stay the same as in public/sw.js.
 */

export const PACKAGES_CACHE = "dojo-packages-v1";

export interface PrecacheManifest {
  /** The build id. */
  version: string;
  /** The versions of the editor and the React bundler. */
  tools: string;
  urls: string[];
}

export function appCacheName(manifest: PrecacheManifest): string {
  return "dojo-app-" + manifest.version;
}

export function toolsCacheName(manifest: PrecacheManifest | null): string {
  return "dojo-tools-" + (manifest ? manifest.tools : "dev");
}

/** The address the worker is registered with. It changes with every build, so a new build installs again. */
export function workerUrl(manifest: PrecacheManifest | null): string {
  if (manifest === null) return "/sw.js?dev=1";
  return "/sw.js?v=" + encodeURIComponent(manifest.version) + "&t=" + encodeURIComponent(manifest.tools);
}

function isTool(url: string): boolean {
  return url.startsWith("/monaco/") || url.startsWith("/sandpack/") || url.startsWith("/test-frame/");
}

export interface OfflineProgress {
  /** Pages and files of the app that are saved, out of all of them. Null in dev. */
  app: { saved: number; total: number } | null;
  /** True when the live React preview has run once and its packages are saved. */
  preview: boolean;
}

async function countSaved(cacheName: string, urls: string[]): Promise<number> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const saved = new Set<string>();
  for (let i = 0; i < keys.length; i++) saved.add(new URL(keys[i].url).pathname);
  let count = 0;
  for (let i = 0; i < urls.length; i++) {
    if (saved.has(decodeURI(urls[i])) || saved.has(urls[i])) count++;
  }
  return count;
}

async function hasEntry(cacheName: string, part: string): Promise<boolean> {
  if (!(await caches.has(cacheName))) return false;
  const keys = await (await caches.open(cacheName)).keys();
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].url.includes(part)) return true;
  }
  return false;
}

/** How much is saved for offline use right now. */
export async function readOfflineProgress(manifest: PrecacheManifest | null): Promise<OfflineProgress> {
  // The preview needs React itself from the CDN. In a production build it
  // also needs the bundler's files, which are saved as it runs.
  let preview = await hasEntry(PACKAGES_CACHE, "/packages/react-dom/");
  if (preview && manifest !== null) {
    preview = await hasEntry(toolsCacheName(manifest), "babel-transpiler");
  }

  if (manifest === null) return { app: null, preview };

  const appUrls: string[] = [];
  const toolUrls: string[] = [];
  for (let i = 0; i < manifest.urls.length; i++) {
    (isTool(manifest.urls[i]) ? toolUrls : appUrls).push(manifest.urls[i]);
  }
  const saved =
    (await countSaved(appCacheName(manifest), appUrls)) + (await countSaved(toolsCacheName(manifest), toolUrls));
  return { app: { saved, total: manifest.urls.length }, preview };
}
