import { defineConfig } from "vitest/config";

export default defineConfig({
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
