import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { FrwdDocument } from "@frwd/format";
import { inspect } from "@frwd/sanitize";

/**
 * The editor, driven the way a person drives it.
 *
 * Every action here goes through the real UI - the real file picker, the real
 * toolbar buttons - because the bugs manual use found lived in the wiring
 * between a person and the model, which the model's own tests cannot see.
 */

const FIXTURE = resolve(process.cwd(), "fixtures", "business-report", "annual-review.frwd");

interface Introspection {
  source: () => string | null;
  readOnly: () => boolean | null;
  diagnostics: () => string[];
}

declare global {
  interface Window {
    __frwdEditor: Introspection;
  }
}

async function openFixture(page: Page, path = FIXTURE): Promise<void> {
  await page.goto("/");
  await page.setInputFiles("#open", path);
  await expect(page.locator("#status")).toContainText("Opened");
  await expect(page.locator("#surface [data-frwd-id]").first()).toBeVisible();
}

const source = (page: Page): Promise<string | null> => page.evaluate(() => window.__frwdEditor.source());

/**
 * Click a block and wait for the region to actually mount.
 *
 * Clicking is not the same as being ready to type: the region is created in the
 * mousedown handler, and typing before `contenteditable` appears sends the
 * keystrokes nowhere. Waiting for the attribute is the honest signal.
 */
async function focusBlock(page: Page, locator: ReturnType<Page["locator"]>): Promise<void> {
  await locator.click();
  await expect(locator).toHaveAttribute("contenteditable", "true");

  // Mounted is not the same as ready to type. The caret is placed by the view's
  // own handling of the same mousedown that created it, so the honest signal is
  // a selection actually sitting inside this block - not the attribute that
  // appeared a moment earlier.
  await expect
    .poll(async () =>
      locator.evaluate((element) => {
        const selection = window.getSelection();
        return (
          document.activeElement === element &&
          selection !== null &&
          selection.rangeCount > 0 &&
          element.contains(selection.getRangeAt(0).startContainer)
        );
      }),
    )
    .toBe(true);
}

/** Select the whole text of a block through the real DOM, as a user would. */
async function selectAllIn(page: Page, locator: ReturnType<Page["locator"]>): Promise<void> {
  await focusBlock(page, locator);
  await locator.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

test.describe("native document", () => {
  test("opens with its own stylesheet and every block intact", async ({ page }) => {
    await openFixture(page);

    await expect(page.locator("#surface h1")).toHaveText("The year we stopped guessing");
    await expect(page.locator("#surface [data-frwd-id]")).toHaveCount(54);
    await expect(page.locator("#surface figure svg")).toHaveCount(1);
    await expect(page.locator("#quarantine")).toBeHidden();

    // The document's own CSS is applied, not approximated: the measure it sets
    // constrains the rendered width.
    const width = await page.locator("#surface .flow").evaluate((element) => element.getBoundingClientRect().width);
    expect(width).toBeLessThan(700);
  });

  test("toolbar bold and italic apply to the selection", async ({ page }) => {
    // The regression manual use found. Deliberately uses the toolbar buttons
    // rather than the region model or keyboard shortcuts: the bug was that
    // pressing a toolbar button committed the region before the click handler
    // ran, so the formatting had nothing left to act on.
    await openFixture(page);

    const paragraph = page.locator("#surface p[data-frwd-id]").nth(1);
    await selectAllIn(page, paragraph);

    await page.click("#bold");
    await expect(paragraph.locator("strong")).toHaveCount(1);

    await page.click("#italic");
    await expect(paragraph.locator("em")).toHaveCount(1);

    // And it survives leaving the block, which is when the region commits.
    await page.locator("#surface h1").click();
    await expect(paragraph.locator("strong")).toHaveCount(1);
    expect(await source(page)).toContain("<strong>");
  });

  // Note on the assertions below: a trailing space typed into a contenteditable
  // region serializes as `&nbsp;`, which is the browser keeping it visible
  // rather than anything FRWD does. The tests assert on the word.
  test("typing changes the text and keeps the block's identity", async ({ page }) => {
    await openFixture(page);

    const paragraph = page.locator("#surface p[data-frwd-id]").nth(1);
    const id = await paragraph.getAttribute("data-frwd-id");

    await focusBlock(page, paragraph);
    await page.keyboard.type("EDITED ");
    await page.locator("#surface h1").click();

    await expect(page.locator("#status")).toContainText("Edited text");
    const saved = await source(page);
    expect(saved).toContain("EDITED");
    expect(saved).toContain(`data-frwd-id="${id}"`);
  });

  test("insert, move and theme all go through FRWD Ops", async ({ page }) => {
    await openFixture(page);

    const before = (await source(page))!;
    const paragraph = page.locator("#surface p[data-frwd-id]").nth(1);
    await focusBlock(page, paragraph);

    await page.click("#new-paragraph");
    await expect(page.locator("#status")).toContainText("Added a paragraph");
    expect(await source(page)).toContain("New paragraph.");

    await page.locator("#surface p[data-frwd-id]").nth(1).click();
    await page.click("#move-down");
    await expect(page.locator("#status")).toContainText("Reordered");

    await page.evaluate(() => {
      window.prompt = (message?: string) => (message?.includes("Theme token") ? "--accent" : "#b03030");
      window.confirm = () => true;
    });
    await page.click("#theme");
    await expect(page.locator("#status")).toContainText("Set --accent");

    const after = (await source(page))!;
    expect(after).toContain("#b03030");
    expect(after).not.toBe(before);
  });

  test("undo and redo step through the whole history", async ({ page }) => {
    await openFixture(page);
    const original = (await source(page))!;

    const paragraph = page.locator("#surface p[data-frwd-id]").nth(1);
    await focusBlock(page, paragraph);
    await page.keyboard.type("ONE ");
    await page.locator("#surface h1").click();
    const edited = (await source(page))!;
    expect(edited).toContain("ONE");

    await page.click("#undo");
    await expect(page.locator("#status")).toContainText("Undone");
    expect(await source(page)).toBe(original);

    await page.click("#redo");
    await expect(page.locator("#status")).toContainText("Redone");
    expect(await source(page)).toBe(edited);
  });

  test("saves a file that still parses, validates and is inside the safety profile", async ({ page }) => {
    await openFixture(page);

    const paragraph = page.locator("#surface p[data-frwd-id]").nth(1);
    await focusBlock(page, paragraph);
    await page.keyboard.type("SAVED EDIT ");
    await page.locator("#surface h1").click();

    const download = await Promise.all([page.waitForEvent("download"), page.click("#save")]).then(([event]) => event);
    const path = await download.path();
    const saved = readFileSync(path, "utf8");

    const reopened = FrwdDocument.parse(saved);
    expect(reopened.errors, "saved document must be structurally conforming").toEqual([]);
    expect(
      inspect(reopened.tree).filter((diagnostic) => diagnostic.severity === "error"),
      "saved document must be inside the native safety profile",
    ).toEqual([]);

    // The edit is there, and so is everything that was there before it.
    expect(saved).toContain("SAVED EDIT");
    expect(reopened.identified.size).toBe(54);
    expect(reopened.css).toContain("--measure");
    expect(saved).toContain("<frwd-callout");
    expect(saved).toContain("<svg");
  });

  test("publishes a .frwd.html", async ({ page }) => {
    await openFixture(page);

    const download = await Promise.all([page.waitForEvent("download"), page.click("#publish")]).then(([event]) => event);
    expect(download.suggestedFilename()).toContain(".frwd.html");

    const published = readFileSync(await download.path(), "utf8");
    expect(published).toContain('id="frwd-runtime"');
    expect(published).toContain("The year we stopped guessing");
  });
});
