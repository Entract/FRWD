import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the editor shell.
 *
 * Separate from `playwright.config.ts` because the two suites need opposite
 * things: publications are opened as local files with no server at all, while
 * the editor is an application that needs one. Putting a `webServer` in the
 * shared config would start a dev server for every `file://` test that has no
 * use for it.
 *
 * These drive the real UI. The region model already has its own coverage; what
 * this suite exists for is the wiring between a person and that model, which is
 * where manual use found bugs the unit tests could not see.
 */
export default defineConfig({
  testDir: "tests/editor",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: "http://localhost:5174", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @frwd/editor dev --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
