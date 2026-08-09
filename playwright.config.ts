import { defineConfig, devices } from "@playwright/test";

/**
 * Browser conformance for FRWD publications.
 *
 * A published .frwd.html must work as an ordinary file in an ordinary browser,
 * so these suites load from file:// with no server, and cover the two cases the
 * format promises: fully offline, and readable with JavaScript disabled.
 *
 * Chromium, Firefox and WebKit all run from the moment the publisher exists -
 * cross-browser behaviour is a format guarantee, not an editor concern.
 */
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  // Documents that embed video and audio take real time to load in a real
  // browser; the default 30s is tight once several run in parallel.
  timeout: 60_000,
  // Same reason: a locator assertion against a document carrying embedded media
  // can outlast the default 5s while the engine is still settling.
  expect: { timeout: 15_000 },
  // Four projects loading documents with embedded video and audio saturate one
  // machine, and a page that has not finished loading fails assertions that are
  // perfectly true. Capped rather than compensated for with longer waits.
  workers: 2,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],
  // Publications are opened as local files, never served - so no baseURL and no
  // webServer.
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /.*\.nojs\.spec\.ts/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: /.*\.nojs\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /.*\.nojs\.spec\.ts/,
    },
    {
      name: "chromium-no-js",
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
      testMatch: /.*\.nojs\.spec\.ts/,
    },
  ],
});
