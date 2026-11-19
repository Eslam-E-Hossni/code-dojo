import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party builds copied by scripts/copy-assets.mjs:
    "public/monaco/**",
    "public/sandpack/**",
    // The test runner, bundled by scripts/build-test-frame.mjs, and its small Node stand-ins:
    "public/test-frame/**",
    "scripts/test-frame-*.js",
  ]),
]);

export default eslintConfig;
