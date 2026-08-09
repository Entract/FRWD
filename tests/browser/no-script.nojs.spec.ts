import { expect, test } from "@playwright/test";
import { publishFixture } from "./support/publications.js";

/**
 * The same publications with JavaScript disabled.
 *
 * A publication that only works when its script runs is a program that happens
 * to contain a document. This suite exists to keep it the other way round.
 */

const MINIMAL = publishFixture("minimal/minimal");
const COMPONENTS = publishFixture("components/rich-components");

test("the document reads normally", async ({ page }) => {
  await page.goto(MINIMAL);

  await expect(page.locator("h1")).toHaveText("Minimal FRWD");
  await expect(page.getByText("The smallest document that still exercises")).toBeVisible();
  await expect(page.locator("li")).toHaveCount(3);
  await expect(page.locator("figcaption")).toContainText("Invariant 1");
});

test("the document's own styling still applies", async ({ page }) => {
  await page.goto(MINIMAL);
  const width = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
  expect(width).toBeLessThan(700);
});

test("the runtime does not install, and nothing is missing because of it", async ({ page }) => {
  await page.goto(COMPONENTS);

  await expect(page.locator("html")).not.toHaveAttribute("data-frwd-runtime", "active");
  await expect(page.locator("frwd-callout")).not.toHaveAttribute("data-frwd-hydrated", "static");

  // Every component's fallback content is the content.
  await expect(page.getByText("A callout is ordinary complementary content")).toBeVisible();
  await expect(page.locator("figcaption")).toContainText("Quarterly revenue");
  await expect(page.locator("img")).toHaveCount(1);
  await expect(page.getByText("Ordinary prose continues")).toBeVisible();
});

test("native disclosure still opens, because the browser owns it", async ({ page }) => {
  await page.goto(COMPONENTS);

  const body = page.locator("details > span");
  await expect(body).toBeHidden();

  await page.locator("summary").click();
  await expect(body).toBeVisible();
});

test("print still exposes collapsed content with no script at all", async ({ page }) => {
  // The reason print expansion is CSS rather than a beforeprint handler: a
  // handler would drop this content from exactly the printouts nobody can
  // debug.
  await page.goto(COMPONENTS);
  await page.emulateMedia({ media: "print" });

  await expect(page.locator("[data-frwd-disclosure-body]")).toBeVisible();
});
