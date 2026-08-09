import { expect, test } from "@playwright/test";
import { publishEditedFixture, publishFixture } from "./support/publications.js";

/**
 * The designed reference document, under the claims it exists to demonstrate.
 *
 * A fixture that only proves it parses proves nothing interesting. These tests
 * ask the two questions a reader would: does it still behave like a document
 * when the text changes, and does the design survive a phone?
 */

const REPORT = publishFixture("business-report/annual-review");

/** The same report after a semantic edit that roughly triples one paragraph. */
const EDITED = publishEditedFixture("business-report/annual-review", {
  op: "replace_text",
  target: "9b3f2c10-5a41-4d8e-8f21-000000000011",
  text: [
    "Three years of flat revenue ended in the second quarter, and it did not end because of a new product.",
    "It ended because we finally measured which customers renewed and asked the ones who did not why they left.",
    "The answers were unflattering and useful in roughly equal measure, and they took most of a quarter to collect,",
    "because the people best placed to answer them were the people we had already lost.",
    "What follows is longer than last year's equivalent section for exactly that reason: the interesting part of the",
    "year was not the number at the top of this page, it was the eighteen conversations that explained it.",
    "Every one of those conversations pointed at the same unglamorous piece of the business, and none of them",
    "pointed at the product roadmap we had spent the previous year defending.",
  ].join(" "),
});

async function layout(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, left: rect.left, width: rect.width };
    };
    return {
      chart: box("figure.wide"),
      table: box("table"),
      callout: box("frwd-callout"),
      rail: box(".rail"),
      flow: box(".flow"),
      documentHeight: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

test.describe("it is a document, not a layout", () => {
  test("a substantial text edit reflows everything after it, with nothing repositioned by hand", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(REPORT);
    const before = await layout(page);

    await page.goto(EDITED);
    const after = await layout(page);

    // The edit is above the figure, the table and the callout: all three move
    // down, in order, and none of them overlaps anything.
    expect(after.documentHeight).toBeGreaterThan(before.documentHeight);
    expect(after.chart!.top).toBeGreaterThan(before.chart!.top);
    expect(after.table!.top).toBeGreaterThan(before.table!.top);
    expect(after.callout!.top).toBeGreaterThan(before.callout!.top);

    expect(after.chart!.bottom).toBeLessThanOrEqual(after.table!.top);
    expect(after.table!.bottom).toBeLessThanOrEqual(after.callout!.top);

    // Widths are untouched: nothing was scaled or nudged to make room.
    expect(after.chart!.width).toBeCloseTo(before.chart!.width, 0);
    expect(after.rail!.width).toBeCloseTo(before.rail!.width, 0);
    expect(after.overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("the designed layout survives a phone", () => {
  test("puts the rail beside the text on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(REPORT);

    const { flow, rail } = await layout(page);
    expect(rail!.left).toBeGreaterThan(flow!.left + flow!.width - 1);
  });

  test("stacks the rail under the text on a narrow one, losing nothing", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(REPORT);

    const { flow, rail, overflow } = await layout(page);

    expect(rail!.top).toBeGreaterThan(flow!.top);
    expect(Math.abs(rail!.left - flow!.left)).toBeLessThan(2);
    expect(overflow).toBeLessThanOrEqual(1);

    // Same document, not a cut-down one.
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Net retention")).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(4);
  });

  test("keeps the chart inside its column at every width", async ({ page }) => {
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(REPORT);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("print", () => {
  test("drops the disclosure control and keeps its content", async ({ page }) => {
    await page.goto(REPORT);
    await page.emulateMedia({ media: "print" });

    await expect(page.locator("[data-frwd-disclosure-toggle]")).toBeHidden();
    await expect(page.locator("[data-frwd-disclosure-body]")).toBeVisible();
    await expect(page.getByText("Recurring revenue is contracted revenue")).toBeVisible();
  });

  test("keeps the whole document present on paper", async ({ page }) => {
    await page.goto(REPORT);
    await page.emulateMedia({ media: "print" });

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("figure.wide svg")).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("frwd-callout")).toBeVisible();
    await expect(page.locator(".rail")).toBeVisible();
  });
});
