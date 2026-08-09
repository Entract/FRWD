import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Cross-package imports resolve to source, so tests never require a build
      // step. Published consumers still get dist via each package's exports.
      "@frwd/format": fileURLToPath(new URL("./packages/format/src/index.ts", import.meta.url)),
    },
  },
  test: {
    // Unit tests live beside the code they cover; conformance, roundtrip and
    // security suites live under tests/. Browser tests are Playwright's job
    // and are deliberately excluded here.
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/test/**/*.test.ts",
      "tests/conformance/**/*.test.ts",
      "tests/roundtrip/**/*.test.ts",
      "tests/security/**/*.test.ts",
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      include: ["packages/*/src/**/*.ts"],
    },
  },
});
