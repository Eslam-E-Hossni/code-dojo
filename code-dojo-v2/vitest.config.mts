import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Some tests run a wrong or an empty solution on purpose. A promise that such code
    // leaves rejected is the solution's own failure, and the hidden tests report it.
    // It is not an error of the test run, so it must not fail `npm test`.
    onUnhandledError(error) {
      const stack = String((error as { stack?: unknown }).stack ?? "");
      if (stack.includes("dojo-user.js")) return false;
    },
  },
});
