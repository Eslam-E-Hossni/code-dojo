// Copies two third-party builds from node_modules into /public, so the app
// serves them itself instead of loading them from a CDN:
//   - the Monaco editor            -> public/monaco
//   - the Sandpack bundler (React) -> public/sandpack
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function copy({ label, packageDir, from, to, remove = [] }) {
  const pkgDir = join(root, "node_modules", ...packageDir.split("/"));
  const source = join(pkgDir, ...from.split("/"));
  const target = join(root, "public", to.name);
  const stamp = join(target, "version.txt.dojo");

  if (!existsSync(source)) {
    console.error(label + " is not installed. Run npm install first.");
    process.exit(1);
  }

  const version = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version;
  if (existsSync(stamp) && readFileSync(stamp, "utf8") === version) return;

  // Empty the folder instead of deleting it: on Windows the folder itself
  // can be locked while a dev server is watching it.
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(target)) {
    rmSync(join(target, name), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  cpSync(source, to.inside ? join(target, to.inside) : target, { recursive: true });
  for (const name of readdirSync(target)) {
    if (remove.some((pattern) => pattern.test(name))) rmSync(join(target, name), { force: true });
  }
  writeFileSync(stamp, version);
  console.log("Copied " + label + " " + version + " to public/" + to.name);
}

copy({
  label: "Monaco",
  packageDir: "monaco-editor",
  from: "min/vs",
  to: { name: "monaco", inside: "vs" },
});

copy({
  label: "the Sandpack bundler",
  packageDir: "@codesandbox/sandpack-client",
  from: "sandpack",
  to: { name: "sandpack" },
  // The bundler's own service workers must never be registered on this
  // site: they would take over pages that are not theirs.
  remove: [/^service-worker\.js$/, /^sandbox-service-worker\.js$/, /^sw\..*\.worker\.js$/],
});
