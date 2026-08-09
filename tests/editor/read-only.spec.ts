import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { FrwdDocument } from "@frwd/format";
import { publish } from "@frwd/publisher";

/**
 * A document that did not open as conforming native FRWD is readable and
 * diagnosable, and nothing more.
 *
 * This is the load pipeline's rule, tested where a user would meet it. Manual
 * use found the editor refusing operations on such a file while still letting
 * text regions mount and be typed into - refusing the loud things and allowing
 * the quiet one.
 */

const root = process.cwd();

/** A real publication: valid HTML, carrying the runtime, not a native FRWD. */
const PUBLICATION = (() => {
  const source = readFileSync(resolve(root, "fixtures", "business-report", "annual-review.frwd"), "utf8");
  const result = publish(FrwdDocument.parse(source));
  if (!result.ok || !result.html) throw new Error("could not build a publication for the test");

  const target = resolve(root, "test-results", "editor", "annual-review.frwd.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, result.html, "utf8");
  return target;
})();

const WITH_SCRIPT = resolve(root, "fixtures", "security", "inline-script.frwd");

declare global {
  interface Window {
    __frwdEditor: { source: () => string | null; readOnly: () => boolean | null; diagnostics: () => string[] };
  }
}

async function open(page: Page, path: string): Promise<void> {
  await page.goto("/");
  await page.setInputFiles("#open", path);
  await expect(page.locator("#surface [data-frwd-id]").first()).toBeVisible();
}

for (const scenario of [
  { label: "a published .frwd.html", path: PUBLICATION, expected: "executable-script" },
  { label: "a document containing a script", path: WITH_SCRIPT, expected: "executable-script" },
] as const) {
  test.describe(scenario.label, () => {
    test("is shown, diagnosed, and marked read-only", async ({ page }) => {
      await open(page, scenario.path);

      await expect(page.locator("#quarantine")).toBeVisible();
      await expect(page.locator("#quarantine")).toContainText("Read-only");
      await expect(page.locator("#quarantine")).toContainText(scenario.expected);
      await expect(page.locator("#status")).toContainText("problem");

      expect(await page.evaluate(() => window.__frwdEditor.readOnly())).toBe(true);
      expect(await page.evaluate(() => window.__frwdEditor.diagnostics())).toContain(scenario.expected);

      // Still readable: quarantine is not a blank screen.
      await expect(page.locator("#surface h1")).toBeVisible();
    });

    test("cannot be typed into", async ({ page }) => {
      await open(page, scenario.path);
      const before = await page.evaluate(() => window.__frwdEditor.source());

      const paragraph = page.locator("#surface p[data-frwd-id]").first();
      await paragraph.click();
      await expect(page.locator("#status")).toContainText("read-only");

      // No region mounted: nothing in the surface became editable.
      await expect(page.locator("#surface [contenteditable]")).toHaveCount(0);

      await page.keyboard.type("SHOULD NOT APPEAR");
      await page.locator("#quarantine").click();

      expect(await page.evaluate(() => window.__frwdEditor.source())).toBe(before);
      expect(before).not.toContain("SHOULD NOT APPEAR");
    });

    test("offers no control that could change it", async ({ page }) => {
      await open(page, scenario.path);

      for (const control of ["#bold", "#italic", "#link", "#new-paragraph", "#move-up", "#move-down", "#theme", "#save", "#undo", "#redo"]) {
        await expect(page.locator(control), `${control} must be disabled`).toBeDisabled();
      }
    });

    test("leaves the source byte-identical after being poked at", async ({ page }) => {
      await open(page, scenario.path);
      const before = await page.evaluate(() => window.__frwdEditor.source());

      // Everything a frustrated user would try.
      await page.locator("#surface h1").click();
      await page.locator("#surface p[data-frwd-id]").first().dblclick();
      await page.keyboard.type("nope");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Backspace");
      await page.waitForTimeout(200);

      expect(await page.evaluate(() => window.__frwdEditor.source())).toBe(before);
    });
  });
}

test("the native picker asks for .frwd, not any HTML", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator("#open").getAttribute("accept")).toBe(".frwd");
});
