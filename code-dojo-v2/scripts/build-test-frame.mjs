// Bundles the test runner of the Testing track into one file:
//   lib/testing/frame/main.ts  ->  public/test-frame/frame.js
//
// The file holds React, React Testing Library, user-event, jest-dom and the
// parts of Jest the runner is made of (expect, jest-mock, fake timers). The
// app puts it in a hidden, sandboxed iframe for every test run, so nothing
// is downloaded from a CDN and tests also run offline.
import { build } from "esbuild";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "test-frame");
const outFile = join(outDir, "frame.js");
const empty = join(root, "scripts", "test-frame-empty.js");

// Node modules that Jest's packages import but never need in a browser.
const NODE_ONLY = ["fs", "graceful-fs", "path", "tty", "os", "module", "url", "util", "assert", "stream", "constants", "node:fs", "node:path"];
const alias = {};
for (const name of NODE_ONLY) alias[name] = empty;
alias.process = join(root, "scripts", "test-frame-process.js");

mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(root, "lib", "testing", "frame", "main.ts")],
  outfile: outFile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  // Names are kept: Jest prints function and class names in its messages.
  minify: true,
  keepNames: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"test"', global: "globalThis" },
  inject: [join(root, "scripts", "test-frame-shims.js")],
  alias,
  logLevel: "warning",
});

const version = (name) => JSON.parse(readFileSync(join(root, "node_modules", ...name.split("/"), "package.json"), "utf8")).version;
const stamp = ["react", "@testing-library/react", "@testing-library/user-event", "expect"].map(version).join("_");
writeFileSync(join(outDir, "version.txt.dojo"), stamp + "_" + statSync(outFile).size);
console.log("Built the test frame: " + (statSync(outFile).size / 1024 / 1024).toFixed(2) + " MB");
