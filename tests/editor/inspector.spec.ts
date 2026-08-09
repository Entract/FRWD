import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { FrwdDocument, getAttr } from "@frwd/format";
import { readStyleProperties } from "@frwd/operations";
import { inspect } from "@frwd/sanitize";

/**
 * The properties panel, driven through the real UI.
 *
 * The claim under test is that adjusting an object produces one deliberate
 * declaration on that object - not a copy of everything the browser computed,
 * and not a rewrite of the document's stylesheet.
 */

const REPORT = resolve(process.cwd(), "fixtures", "business-report", "annual-review.frwd");

declare global {
  interface Window {
    __frwdEditor: { source: () => string | null; readOnly: () => boolean | null; diagnostics: () => string[] };
  }
}

const source = (page: Page): Promise<string> =>
  page.evaluate(() => window.__frwdEditor.source() ?? "");

async function open(page: Page): Promise<void> {
  await page.goto("/");
  await page.setInputFiles("#open", REPORT);
  await expect(page.locator("#surface [data-frwd-id]").first()).toBeVisible();
}

/** Select a containing object by climbing the breadcrumb, as a user would. */
async function selectContainer(page: Page, locator: Locator): Promise<string> {
  const id = (await locator.getAttribute("data-frwd-id"))!;
  await locator.click();
  const crumb = page.locator(`#breadcrumb [data-crumb-id="${id}"]`);
  if ((await crumb.count()) > 0) await crumb.click();
  await expect(page.locator(`#surface [data-frwd-id="${id}"].is-selected`)).toHaveCount(1);
  return id;
}

/** Declarations actually on the canonical element. */
function overridesOf(html: string, id: string): Record<string, string> {
  const document = FrwdDocument.parse(html);
  return readStyleProperties(getAttr(document.getElementById(id)!, "style") ?? "");
}

const field = (page: Page, property: string): Locator => page.locator(`.chrome-field[data-property="${property}"]`);

test.describe("selected-object spacing", () => {
  test("sets one declaration, keeps everything else, and undoes cleanly", async ({ page }) => {
    await open(page);

    const card = page.locator("#surface .rail dl[data-frwd-id]").first();
    const id = await selectContainer(page, card);

    const before = await source(page);
    expect(overridesOf(before, id)).toEqual({});

    const paddingBefore = await card.evaluate((element) => window.getComputedStyle(element).paddingTop);

    await field(page, "padding-top").locator("input").fill("18px");
    await field(page, "padding-top").locator("input").press("Enter");
    await expect(page.locator("#status")).toContainText("Set padding-top");

    // Exactly one declaration, and nothing else about the object moved.
    const after = await source(page);
    expect(overridesOf(after, id)).toEqual({ "padding-top": "18px" });

    const document = FrwdDocument.parse(after);
    const element = document.getElementById(id)!;
    expect(getAttr(element, "data-frwd-id")).toBe(id);
    expect(getAttr(element, "class")).toContain("metric");
    expect(element.childNodes.length).toBeGreaterThan(0);

    // The browser agrees something changed.
    await expect
      .poll(async () => card.evaluate((node) => window.getComputedStyle(node).paddingTop))
      .not.toBe(paddingBefore);

    await page.click("#undo");
    expect(overridesOf(await source(page), id)).toEqual({});

    await page.click("#redo");
    expect(overridesOf(await source(page), id)).toEqual({ "padding-top": "18px" });
  });

  test("marks a value as local or coming from a rule", async ({ page }) => {
    await open(page);
    const card = page.locator("#surface .rail dl[data-frwd-id]").first();
    await selectContainer(page, card);

    // Before any edit: the value shown comes from the stylesheet, and nothing
    // has been written to the object.
    await expect(field(page, "padding-top").locator(".chrome-field-state")).toHaveAttribute("data-state", "inherited");
    await expect(field(page, "padding-top").locator(".chrome-field-clear")).toBeHidden();

    await field(page, "padding-top").locator("input").fill("18px");
    await field(page, "padding-top").locator("input").press("Enter");

    await expect(field(page, "padding-top").locator(".chrome-field-state")).toHaveAttribute("data-state", "override");
    await expect(field(page, "padding-top").locator(".chrome-field-state")).toHaveText("local");
    await expect(field(page, "padding-top").locator(".chrome-field-clear")).toBeVisible();
  });
});

test("clearing an override hands the property back to the stylesheet", async ({ page }) => {
  await open(page);

  // A block whose padding genuinely comes from a class rule.
  const callout = page.locator("#surface .frwd-callout[data-frwd-id]").first();
  const id = await selectContainer(page, callout);
  const fromRule = await callout.evaluate((element) => window.getComputedStyle(element).paddingTop);

  await field(page, "padding-top").locator("input").fill("30px");
  await field(page, "padding-top").locator("input").press("Enter");
  await expect
    .poll(async () => callout.evaluate((node) => window.getComputedStyle(node).paddingTop))
    .toBe("30px");
  expect(overridesOf(await source(page), id)).toEqual({ "padding-top": "30px" });

  await field(page, "padding-top").locator(".chrome-field-clear").click();
  await expect(page.locator("#status")).toContainText("Cleared the local padding-top");

  // Back to the class's value, and the attribute is gone rather than empty.
  await expect
    .poll(async () => callout.evaluate((node) => window.getComputedStyle(node).paddingTop))
    .toBe(fromRule);
  expect(overridesOf(await source(page), id)).toEqual({});
  expect(await source(page)).not.toContain('style=""');
});

test("selecting an object writes nothing", async ({ page }) => {
  await open(page);
  const before = await source(page);

  await selectContainer(page, page.locator("#surface .rail dl[data-frwd-id]").first());
  await selectContainer(page, page.locator("#surface .frwd-callout[data-frwd-id]").first());
  await page.locator("#surface .flow p[data-frwd-id]").first().click();

  expect(await source(page)).toBe(before);
});

test.describe("container layout", () => {
  test("changes a grid from three columns to two without touching the children", async ({ page }) => {
    await open(page);

    // The report's body is a real CSS Grid container.
    const grid = page.locator("#surface .body[data-frwd-id]").first();
    const id = await selectContainer(page, grid);

    const childrenBefore = await grid.evaluate((element) =>
      Array.from(element.children).map((child) => child.getAttribute("data-frwd-id")),
    );

    await expect(page.locator('[data-testid="columns"]')).toBeVisible();
    await page.locator('[data-testid="columns"] button[data-columns="2"]').click();
    await expect(page.locator("#status")).toContainText("grid-template-columns");

    await field(page, "gap").locator("input").fill("6mm");
    await field(page, "gap").locator("input").press("Enter");

    const after = await source(page);
    expect(overridesOf(after, id)).toEqual({ "grid-template-columns": "repeat(2, 1fr)", gap: "6mm" });

    // The children are the same objects, in the same order, untouched.
    const childrenAfter = await grid.evaluate((element) =>
      Array.from(element.children).map((child) => child.getAttribute("data-frwd-id")),
    );
    expect(childrenAfter).toEqual(childrenBefore);
    for (const child of childrenBefore) {
      expect(overridesOf(after, child!)).toEqual({});
    }

    // The browser rendered two columns.
    const columns = await grid.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").length,
    );
    expect(columns).toBe(2);
  });
});

test("theme changes stay theme changes", async ({ page }) => {
  await open(page);

  const card = page.locator("#surface .rail dl[data-frwd-id]").first();
  await selectContainer(page, card);
  const before = await source(page);

  await page.evaluate(() => {
    window.prompt = (message?: string) => (message?.includes("Theme token") ? "--accent" : "#b03030");
    window.confirm = () => true;
  });
  await page.click("#theme");
  await expect(page.locator("#status")).toContainText("Set --accent");

  const after = await source(page);
  expect(after).toContain("#b03030");

  // One token in the stylesheet, and not a single local override anywhere.
  const document = FrwdDocument.parse(after);
  const styled = [...document.identified.values()].filter((element) => getAttr(element, "style") !== undefined);
  expect(styled).toHaveLength(0);
  expect(after.split("#b03030").length - 1).toBe(1);
  expect(before).not.toContain("#b03030");
});

test("an unsafe value is refused atomically", async ({ page }) => {
  await open(page);

  const card = page.locator("#surface .rail dl[data-frwd-id]").first();
  const id = await selectContainer(page, card);
  const before = await source(page);

  await field(page, "background-color").locator("input").fill("url(https://example.invalid/x.png)");
  await field(page, "background-color").locator("input").press("Enter");

  await expect(page.locator("#status")).toContainText("Refused");
  expect(await source(page)).toBe(before);
  expect(overridesOf(await source(page), id)).toEqual({});
});

test("classes are document vocabulary the panel can edit", async ({ page }) => {
  await open(page);

  const card = page.locator("#surface .rail dl[data-frwd-id]").first();
  const id = await selectContainer(page, card);

  await expect(page.locator('[data-testid="classes"] .chrome-chip')).toHaveCount(1);
  await page.locator('[data-testid="classes"] button[data-remove-class="metric"]').click();
  await expect(page.locator("#status")).toContainText("Changed classes");

  const document = FrwdDocument.parse(await source(page));
  expect(getAttr(document.getElementById(id)!, "class")).toBeUndefined();
  expect(getAttr(document.getElementById(id)!, "data-frwd-id")).toBe(id);
});

test("style edits still save a conforming document", async ({ page }) => {
  await open(page);

  await selectContainer(page, page.locator("#surface .rail dl[data-frwd-id]").first());
  await field(page, "padding-top").locator("input").fill("18px");
  await field(page, "padding-top").locator("input").press("Enter");

  await selectContainer(page, page.locator("#surface .body[data-frwd-id]").first());
  await page.locator('[data-testid="columns"] button[data-columns="2"]').click();

  const download = await Promise.all([page.waitForEvent("download"), page.click("#save")]).then(([event]) => event);
  const saved = readFileSync(await download.path(), "utf8");

  const reopened = FrwdDocument.parse(saved);
  expect(reopened.errors).toEqual([]);
  expect(inspect(reopened.tree).filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);

  expect(saved).toContain("padding-top: 18px");
  expect(saved).toContain("repeat(2, 1fr)");
  expect(saved).not.toContain("is-selected");
});
