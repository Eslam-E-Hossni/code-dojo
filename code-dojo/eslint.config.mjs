import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party builds copied by scripts/copy-assets.mjs:
    "public/monaco/**",
    "public/sandpack/**",
    // Built by scripts/build-test-frame.mjs, and its small Node stand-ins:
    "public/test-frame/**",
    "scripts/test-frame-*.js",
  ]),
]);

export default eslintConfig;
