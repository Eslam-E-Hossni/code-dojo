// Runs after `next build`. Writes public/precache.json: the list of
// everything the service worker (public/sw.js) downloads on its first run,
// so the whole app works with no connection afterwards.
//
//   version  the build id: a new build means a new cache
//   tools    the versions of the editor and the React bundler
//   urls     every page, every /_next/static file, and the editor's files
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const next = join(root, ".next");

if (!existsSync(join(next, "BUILD_ID"))) {
  console.error("No build found. Run `next build` first.");
  process.exit(1);
}

/** Every file under a folder, as paths with forward slashes. */
function walk(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, prefix + name + "/"));
    else out.push(prefix + name);
  }
  return out;
}

function read(path) {
  return readFileSync(path, "utf8").trim();
}

// Pages. The manifest lists every page that was built ahead of time.
const routes = Object.keys(JSON.parse(read(join(next, "prerender-manifest.json"))).routes);
const pages = routes.filter((route) => !route.startsWith("/_") && !route.includes("."));

// The app's own scripts, styles and fonts.
const assets = walk(join(next, "static"))
  .filter((file) => !file.endsWith(".map"))
  .map((file) => "/_next/static/" + encodeURI(file));

// The editor. Left out: translations of its menus, and the helpers for
// CSS, HTML and JSON, which this app never opens.
const SKIP_EDITOR = [/^nls\.messages\./, /(css|html|json)\.worker-/, /^(css|html|json)Mode-/];
const editor = walk(join(root, "public", "monaco", "vs"))
  .filter((file) => !SKIP_EDITOR.some((pattern) => pattern.test(file.split("/").pop())))
  .map((file) => "/monaco/vs/" + encodeURI(file));

// The React bundler has hundreds of files and a preview needs a dozen of
// them. Only its page is listed. The rest is saved the first time a
// preview runs, which the home page does by itself, hidden, once.
// The runner of the Testing track is one file. The page reads it and puts it in a hidden frame.
const urls = [...pages, "/favicon.ico", ...assets, ...editor, "/sandpack/index.html", "/test-frame/frame.js"];

function stamp(folder) {
  const file = join(root, "public", folder, "version.txt.dojo");
  return existsSync(file) ? read(file) : "0";
}

const manifest = {
  version: read(join(next, "BUILD_ID")),
  tools: stamp("monaco") + "_" + stamp("sandpack") + "_" + stamp("test-frame"),
  urls,
};

writeFileSync(join(root, "public", "precache.json"), JSON.stringify(manifest));
console.log(
  "Offline list: " + pages.length + " pages, " + assets.length + " app files, " + editor.length + " editor files.",
);
