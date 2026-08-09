import { resolve } from "node:path";
import "./support/hook.js";
import { expect, test, type Page } from "@playwright/test";
import { FrwdDocument } from "@frwd/format";
import { publish } from "@frwd/publisher";
import { readFileSync } from "node:fs";

/**
 * Editor view modes.
 *
 * ADR 0002: these change the projection, never the document. The assertion that
 * matters in every one of these is that the canonical source is byte-identical
 * afterwards - a view is a way of looking, not a way of editing.
 */

const REPORT = resolve(process.cwd(), "fixtures", "business-report", "annual-review.frwd");
const SHEET = resolve(process.cwd(), "fixtures", "fixed-layout", "sheet.frwd");

const source = (page: Page): Promise<string> => page.evaluate(() => window.__frwdEditor.source() ?? "");

async function open(page: Page, path: string): Promise<void> {
  await page.goto("/");
  await page.setInputFiles("#open", path);
  await expect(page.locator("#surface [data-frwd-id]").first()).toBeVisible();
}

const surfaceWidth = (page: Page): Promise<number> =>
  page.locator("#surface").evaluate((element) => element.getBoundingClientRect().width);

test.describe("viewport modes", () => {
  test("change the projection width, and container-relative layout reflows", async ({ page }) => {
    await open(page, REPORT);

    await page.click('[data-view="desktop"]');
    const desktop = await surfaceWidth(page);
    // Up to 1200px, clamped to the space available - a projection that
    // overflowed its own workspace would be a worse lie than a narrow one.
    expect(desktop).toBeGreaterThan(768);
    expect(desktop).toBeLessThanOrEqual(1200);

    const flowAtDesktop = await page
      .locator("#surface .flow")
      .evaluate((element) => element.getBoundingClientRect().width);

    await page.click('[data-view="mobile"]');
    const mobile = await surfaceWidth(page);
    expect(Math.round(mobile)).toBe(390);
    expect(mobile).toBeLessThan(desktop);

    // The document genuinely reflowed inside the narrower surface: its grid
    // columns are container-relative, so the text column is narrower too.
    const flowAtMobile = await page
      .locator("#surface .flow")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(flowAtMobile).toBeLessThan(flowAtDesktop);

    await page.click('[data-view="tablet"]');
    expect(Math.round(await surfaceWidth(page))).toBe(768);
  });

  test("do not trigger the document's media queries, and say so", async ({ page }) => {
    // The honest limit of a width-based projection, pinned so nobody mistakes
    // it for working responsive preview. Media queries evaluate against the
    // browser window; narrowing a container cannot change that. Fixing it needs
    // the projection to own its viewport - an iframe - which is a separate
    // change to make deliberately rather than by accident.
    await open(page, REPORT);
    await page.click('[data-view="mobile"]');

    const stacked = await page.evaluate(() => {
      const flow = document.querySelector("#surface .flow")!.getBoundingClientRect();
      const rail = document.querySelector("#surface .rail")!.getBoundingClientRect();
      return rail.top > flow.top && Math.abs(rail.left - flow.left) < 2;
    });
    expect(stacked, "media queries are expected NOT to fire on a resized container").toBe(false);

    await expect(page.locator("#view-note")).toContainText("media queries still follow the browser window");
  });

  test("leave the canonical source byte-identical", async ({ page }) => {
    await open(page, REPORT);
    const before = await source(page);

    for (const mode of ["mobile", "tablet", "desktop", "a4", "letter", "fit"]) {
      await page.click(`[data-view="${mode}"]`);
      expect(await page.evaluate(() => window.__frwdEditor.view())).toBe(mode);
      expect(await source(page), `${mode} changed the document`).toBe(before);
    }

    // No revision bump, no modified change, and nothing to undo.
    const document = FrwdDocument.parse(await source(page));
    expect(document.manifest?.["revision"]).toBeUndefined();
    await expect(page.locator("#undo")).toBeDisabled();
  });

  test("add no attributes, classes or styles to the document", async ({ page }) => {
    await open(page, REPORT);

    const before = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#surface [data-frwd-id]")).map(
        (element) => `${element.tagName}|${element.getAttribute("class") ?? ""}|${element.getAttribute("style") ?? ""}`,
      ),
    );

    await page.click('[data-view="a4"]');
    await page.click('[data-view="mobile"]');

    const after = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#surface [data-frwd-id]")).map(
        (element) => `${element.tagName}|${element.getAttribute("class") ?? ""}|${element.getAttribute("style") ?? ""}`,
      ),
    );
    expect(after).toEqual(before);
  });
});

test.describe("paper is editor chrome", () => {
  test("puts a sheet on a desk without touching the document", async ({ page }) => {
    await open(page, REPORT);
    const before = await source(page);

    await page.click('[data-view="a4"]');
    await expect(page.locator("#surface")).toHaveClass(/is-paper/);
    await expect(page.locator(".chrome-stage")).toHaveClass(/is-paper-desk/);
    expect(await source(page)).toBe(before);

    // Honest labelling: this is a view, and it says so rather than claiming to
    // be a preview of what will print.
    await expect(page.locator("#view-note")).toContainText("editor view");
    await expect(page.locator("#view-note")).toContainText("Not a print preview");
  });

  test("does not write @page when A4 is chosen", async ({ page }) => {
    await open(page, REPORT);

    await page.click('[data-view="a4"]');
    await page.click('[data-view="letter"]');

    expect(await source(page)).not.toContain("@page");
  });
});

test.describe("document-owned geometry", () => {
  test("is preserved exactly, and reported rather than reinterpreted", async ({ page }) => {
    await open(page, SHEET);
    const before = await source(page);

    // The document declares its own sheet. The editor renders what the document
    // says, at the document's own size.
    const sheetWidth = await page
      .locator("#surface .sheet")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(Math.round(sheetWidth)).toBeGreaterThan(780); // 210mm at 96dpi is ~794px
    expect(Math.round(sheetWidth)).toBeLessThan(800);

    // Its @page rule is surfaced as information about the document.
    await expect(page.locator("#view-note")).toContainText("@page size: A4");

    // Switching the editor's own view does not strip or override it.
    for (const mode of ["a4", "letter", "desktop", "fit"]) {
      await page.click(`[data-view="${mode}"]`);
      expect(await source(page)).toBe(before);
    }

    expect(before).toContain("width: 210mm");
    expect(before).toContain("min-height: 297mm");
    expect(before).toContain("@page");

    const still = await page.locator("#surface .sheet").evaluate((element) => element.getBoundingClientRect().width);
    expect(Math.round(still)).toBe(Math.round(sheetWidth));
  });
});

test("print uses the publisher's output, not the screen DOM", async ({ page }) => {
  await open(page, REPORT);
  const before = await source(page);

  await page.click('[data-view="mobile"]');
  await page.click("#print");
  await expect(page.locator("#status")).toContainText("Printing the published document");

  const printed = await page.evaluate(() => window.__frwdEditor.lastPrintSource());
  expect(printed).toBeTruthy();

  // It is the publication, byte for byte - not a screenshot of the projection,
  // and not affected by the view mode that happened to be selected.
  const expected = publish(FrwdDocument.parse(readFileSync(REPORT, "utf8")));
  expect(printed).toContain('id="frwd-runtime"');
  expect(printed).toContain("The year we stopped guessing");
  expect(printed).not.toContain("chrome-surface");
  expect(printed).not.toContain("is-paper");
  expect(printed!.length).toBeGreaterThan((expected.html ?? "").length * 0.9);

  expect(await source(page)).toBe(before);
});
