import { expect, test } from "@playwright/test";
import { publishFixture } from "./support/publications.js";

/**
 * The scientific document: equations as structure, not pictures.
 *
 * The claim worth testing in a browser is that MathML is laid out as
 * mathematics rather than falling back to a run of characters, and that the
 * numbering, which comes from CSS counters rather than typed-in numbers,
 * survives a real rendering.
 */

const PAPER = publishFixture("scientific/saturation-kinetics");

test("renders MathML as mathematics", async ({ page }) => {
  await page.goto(PAPER);

  const equation = page.locator('math[display="block"]');
  await expect(equation).toBeVisible();

  // A fraction is laid out as a fraction: numerator stacked above denominator.
  // This is the semantic check - an engine that fell back to plain text would
  // put them side by side - and it needs no magic pixel threshold.
  const stacked = await page.locator("math mfrac").evaluate((node) => {
    const parts = [...node.children].map((child) => child.getBoundingClientRect());
    return parts.length === 2 && parts[0].bottom <= parts[1].top + 1;
  });
  expect(stacked).toBe(true);

  await expect(page.locator("math mfrac")).toHaveCount(1);
  await expect(page.locator("math msup")).toHaveCount(1);
});

test("keeps inline equations inline", async ({ page }) => {
  await page.goto(PAPER);

  const inline = page.locator("p math").first();
  await expect(inline).toBeVisible();

  // Inline maths sits on the text line rather than claiming a block of its own.
  const width = await inline.evaluate((node) => node.getBoundingClientRect().width);
  expect(width).toBeLessThan(80);
});

test("cross-references resolve within the document", async ({ page }) => {
  await page.goto(PAPER);

  await page.getByRole("link", { name: "Figure 1" }).click();
  await expect(page.locator("#fig-saturation")).toBeInViewport();

  await page.getByRole("link", { name: "Table 1" }).click();
  await expect(page.locator("#tab-constants")).toBeInViewport();
});

test("stays inside its column at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(PAPER);

  await expect(page.locator('math[display="block"]')).toBeVisible();
  await expect(page.locator("figure svg")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
