import { readFileSync } from "node:fs";
import "./support/hook.js";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { FrwdDocument } from "@frwd/format";
import { inspect } from "@frwd/sanitize";

/**
 * Structural editing, driven the way a person drives it.
 *
 * The point of these is that a gesture reaches the canonical document through
 * an operation - not that the projection moved. Every assertion that matters
 * here reads the canonical source, not the screen.
 */

const REPORT = resolve(process.cwd(), "fixtures", "business-report", "annual-review.frwd");
const MANUAL = resolve(process.cwd(), "fixtures", "rich-manual", "field-calibration.frwd");

const source = (page: Page): Promise<string> =>
  page.evaluate(() => window.__frwdEditor.source() ?? "").then((value) => value);

async function open(page: Page, path: string): Promise<void> {
  await page.goto("/");
  await page.setInputFiles("#open", path);
  await expect(page.locator("#surface [data-frwd-id]").first()).toBeVisible();
}

/** Select whatever a click lands on - which is always the innermost object. */
async function select(page: Page, locator: Locator): Promise<string> {
  await locator.click();
  await expect(page.locator("#breadcrumb .is-current")).toBeVisible();
  return (await locator.getAttribute("data-frwd-id"))!;
}

/**
 * Select a containing object.
 *
 * Clicking always selects the innermost identified object, because that is what
 * a person pointing at a word means. Reaching the card that word lives in is
 * what the breadcrumb is for, so the tests climb it exactly as a user would -
 * which incidentally proves the affordance works.
 */
async function selectContainer(page: Page, locator: Locator): Promise<string> {
  const id = (await locator.getAttribute("data-frwd-id"))!;
  await locator.click();

  const crumb = page.locator(`#breadcrumb [data-crumb-id="${id}"]`);
  if ((await crumb.count()) > 0) await crumb.click();

  await expect(page.locator(`#surface [data-frwd-id="${id}"].is-selected`)).toHaveCount(1);
  return id;
}

/** Ids of an element's identified children, in canonical order. */
function childIds(html: string, parentId: string): string[] {
  const document = FrwdDocument.parse(html);
  const parent = document.getElementById(parentId)!;
  return parent.childNodes
    .filter((node): node is import("@frwd/format").Element => "tagName" in node)
    .map((child) => child.attrs.find((attribute) => attribute.name === "data-frwd-id")?.value)
    .filter((id): id is string => id !== undefined);
}

test.describe("selection understands the hierarchy", () => {
  test("shows a breadcrumb and can climb to the containing object", async ({ page }) => {
    await open(page, REPORT);

    const paragraph = page.locator("#surface .flow p[data-frwd-id]").first();
    const paragraphId = await select(page, paragraph);

    // The trail ends at the thing selected and starts at the document root.
    await expect(page.locator("#breadcrumb .is-current")).toContainText("p");
    const trail = await page.locator("#breadcrumb .chrome-crumb").allTextContents();
    expect(trail[0]).toBe("main");
    expect(trail.length).toBeGreaterThan(3);

    // Clicking an ancestor selects the container rather than the text.
    const container = page.locator("#breadcrumb .chrome-crumb", { hasText: "section" }).first();
    await container.click();
    await expect(page.locator("#breadcrumb .is-current")).toContainText("section");
    await expect(page.locator("#surface section.is-selected")).toHaveCount(1);

    // And the text child is still reachable.
    await select(page, paragraph);
    await expect(page.locator("#breadcrumb .is-current")).toContainText("p");
    expect(paragraphId).toBeTruthy();
  });
});

test.describe("insertion reasons from context", () => {
  test("a paragraph gets a sibling in the same container", async ({ page }) => {
    await open(page, REPORT);

    const paragraph = page.locator("#surface .flow p[data-frwd-id]").first();
    const id = await select(page, paragraph);
    const parentId = await paragraph.evaluate((element) =>
      element.parentElement?.getAttribute("data-frwd-id"),
    );

    const before = await source(page);
    await page.click("#new-paragraph");
    await expect(page.locator("#status")).toContainText("Added a paragraph");

    const after = await source(page);
    const siblingsBefore = childIds(before, parentId!);
    const siblingsAfter = childIds(after, parentId!);

    // Exactly one new object, in the right container, immediately after the
    // selection, with an identity it did not have before.
    expect(siblingsAfter.length).toBe(siblingsBefore.length + 1);
    const minted = siblingsAfter.filter((sibling) => !siblingsBefore.includes(sibling));
    expect(minted).toHaveLength(1);
    expect(siblingsAfter[siblingsAfter.indexOf(id) + 1]).toBe(minted[0]);
    expect(minted[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("a list item gets another list item, not a naked paragraph", async ({ page }) => {
    await open(page, MANUAL);

    const item = page.locator("#surface ol.steps > li[data-frwd-id]").first();
    const listId = await item.evaluate((element) => element.parentElement?.getAttribute("data-frwd-id"));
    await selectContainer(page, item);

    const before = await source(page);
    await page.click("#new-paragraph");
    await expect(page.locator("#status")).toContainText("list item");

    const after = await source(page);
    expect(childIds(after, listId!).length).toBe(childIds(before, listId!).length + 1);

    // The new object is an li inside the list, not a p beside it.
    await expect(page.locator("#surface ol.steps > li")).toHaveCount(6);
    await expect(page.locator("#surface ol.steps > p")).toHaveCount(0);
  });

  test("refuses where the context is genuinely ambiguous", async ({ page }) => {
    await open(page, REPORT);

    await select(page, page.locator("#surface figcaption[data-frwd-id]").first());
    const before = await source(page);

    await page.click("#new-paragraph");
    await expect(page.locator("#status")).toContainText("one caption");
    expect(await source(page)).toBe(before);
  });
});

test.describe("dragging reorders siblings", () => {
  test("moves a card past its neighbour, keeping its identity, through move_node", async ({ page }) => {
    await open(page, REPORT);

    // The metric cards in the rail: identified siblings in a CSS-styled
    // container, which is the case worth proving survives.
    const cards = page.locator("#surface .rail dl[data-frwd-id]");
    await expect(cards).toHaveCount(4);

    const first = cards.nth(0);
    const movedId = await selectContainer(page, first);
    const railId = await first.evaluate((element) => element.parentElement?.getAttribute("data-frwd-id"));
    const orderBefore = childIds(await source(page), railId!);

    const handle = page.locator("#handle");
    await expect(handle).toBeVisible();

    const handleBox = (await handle.boundingBox())!;
    const secondBox = (await cards.nth(1).boundingBox())!;

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height - 4, { steps: 12 });
    await expect(page.locator("#drop")).toBeVisible();
    await page.mouse.up();

    await expect(page.locator("#status")).toContainText("Reordered");

    const orderAfter = childIds(await source(page), railId!);
    expect(orderAfter).not.toEqual(orderBefore);
    expect(orderAfter.indexOf(movedId)).toBeGreaterThan(orderBefore.indexOf(movedId));
    expect([...orderAfter].sort()).toEqual([...orderBefore].sort());

    // The object travelled rather than being rebuilt: same id, same class,
    // same descendants.
    const moved = page.locator(`#surface [data-frwd-id="${movedId}"]`);
    await expect(moved).toHaveClass(/metric/);
    await expect(moved.locator("dt")).toHaveCount(1);

    // Visual order followed the document. Every identified child of the rail,
    // not just the cards - the rail also holds headings, and the projection
    // must agree with the canonical order in full.
    const visualOrder = await page
      .locator(`#surface [data-frwd-id="${railId}"] > [data-frwd-id]`)
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-frwd-id")));
    expect(visualOrder).toEqual(orderAfter);

    await page.click("#undo");
    expect(childIds(await source(page), railId!)).toEqual(orderBefore);

    await page.click("#redo");
    expect(childIds(await source(page), railId!)).toEqual(orderAfter);
  });

  test("refuses a drag that leaves the parent", async ({ page }) => {
    await open(page, REPORT);

    const card = page.locator("#surface .rail dl[data-frwd-id]").first();
    await selectContainer(page, card);
    const before = await source(page);

    const handleBox = (await page.locator("#handle").boundingBox())!;
    const elsewhere = (await page.locator("#surface .flow h2").first().boundingBox())!;

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(elsewhere.x + elsewhere.width / 2, elsewhere.y + elsewhere.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect(page.locator("#status")).toContainText("only be reordered among its own siblings");
    expect(await source(page)).toBe(before);
  });
});

test("insertion and reordering together still save a conforming document", async ({ page }) => {
  await open(page, REPORT);

  await select(page, page.locator("#surface .flow p[data-frwd-id]").first());
  await page.click("#new-paragraph");
  await expect(page.locator("#status")).toContainText("Added a paragraph");

  const cards = page.locator("#surface .rail dl[data-frwd-id]");
  await selectContainer(page, cards.nth(0));
  const handleBox = (await page.locator("#handle").boundingBox())!;
  const secondBox = (await cards.nth(1).boundingBox())!;
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height - 4, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator("#status")).toContainText("Reordered");

  const download = await Promise.all([page.waitForEvent("download"), page.click("#save")]).then(([event]) => event);
  const saved = readFileSync(await download.path(), "utf8");

  const reopened = FrwdDocument.parse(saved);
  expect(reopened.errors, "saved document must be structurally conforming").toEqual([]);
  expect(
    inspect(reopened.tree).filter((diagnostic) => diagnostic.severity === "error"),
    "saved document must stay inside the safety profile",
  ).toEqual([]);

  // Nothing chrome leaked into the file.
  expect(saved).not.toContain("is-selected");
  expect(saved).not.toContain("is-dragging");
  expect(saved).not.toContain("contenteditable");
  expect(saved).toContain("<svg");
  expect(saved).toContain("class=\"metric\"");
});
