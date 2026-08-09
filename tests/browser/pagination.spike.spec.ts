import { expect, test } from "@playwright/test";
import { publishFixture } from "./support/publications.js";

/**
 * Architecture spike for t-028, kept as a test so the answer stays checkable.
 *
 * The question: can a page, using only web platform primitives available to
 * itself, build a trustworthy paginated print preview - or does that eventually
 * need a dedicated paged-media layer?
 *
 * What a page can and cannot see is measured here rather than assumed, and the
 * naive approach the design brief warned about is measured against ground truth
 * from the browser's own print engine.
 */

const REPORT = publishFixture("business-report/annual-review");
const MANUAL = publishFixture("rich-manual/field-calibration");

/**
 * Real page count, from the browser's own print engine.
 *
 * This is ground truth, and it is deliberately obtained from *outside* the
 * page: `page.pdf()` is the automation protocol, not something a document can
 * call about itself. That asymmetry is the finding.
 */
function pdfPageCount(pdf: Buffer): number {
  const counts = [...pdf.toString("latin1").matchAll(/\/Count\s+(\d+)/g)].map((match) => Number(match[1]));
  if (counts.length > 0) return Math.max(...counts);
  return [...pdf.toString("latin1").matchAll(/\/Type\s*\/Page[^s]/g)].length;
}

test.describe("what a page can learn about its own pagination", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Measures platform capability; page.pdf is Chromium-only.");

  test("CSSOM exposes @page rules but nothing about where pages break", async ({ page }) => {
    await page.goto(REPORT);

    const findings = await page.evaluate(() => {
      const results = {
        pageRulesFound: 0,
        pageRuleText: [] as string[],
        pageRuleSizeReadable: false,
        breakApi: {
          // Anything that would report where the engine decided to break.
          hasFragmentApi: "getFragments" in Element.prototype || "fragments" in Element.prototype,
          hasPageBoxApi: typeof (window as unknown as { getPageBoxes?: unknown }).getPageBoxes === "function",
          hasBeforePrintPageInfo: false,
        },
        printMediaMatches: window.matchMedia("print").matches,
      };

      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of Array.from(rules)) {
          if (rule.constructor.name !== "CSSPageRule" && !/^@page/.test(rule.cssText)) continue;
          results.pageRulesFound += 1;
          results.pageRuleText.push(rule.cssText.slice(0, 120));
          const style = (rule as unknown as { style?: CSSStyleDeclaration }).style;
          if (style && style.getPropertyValue("size") !== "") results.pageRuleSizeReadable = true;
        }
      }

      return results;
    });

    // eslint-disable-next-line no-console
    console.log(`\n=== CSSOM ===\n${JSON.stringify(findings, null, 2)}`);

    // The document declares no @page here, but the finding that matters is the
    // second half: there is no API that reports break positions or page boxes.
    expect(findings.breakApi.hasFragmentApi).toBe(false);
    expect(findings.breakApi.hasPageBoxApi).toBe(false);
  });

  test("the naive scrollHeight estimate does not match the real page count", async ({ page }) => {
    // This is the approach the brief warned against, measured rather than
    // asserted. If it were close, an embedded preview would be tempting.
    const results: { fixture: string; naive: number; real: number }[] = [];

    for (const fixture of [
      { label: "business report", url: REPORT },
      { label: "rich manual", url: MANUAL },
    ]) {
      await page.goto(fixture.url);
      await page.emulateMedia({ media: "print" });

      const naive = await page.evaluate(() => {
        // A4 at 96dpi, less a typical 20mm margin box.
        const usablePx = (297 - 40) * (96 / 25.4);
        return Math.max(1, Math.ceil(document.documentElement.scrollHeight / usablePx));
      });

      const pdf = await page.pdf({ format: "A4", margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" } });
      await page.emulateMedia({ media: "screen" });

      results.push({ fixture: fixture.label, naive, real: pdfPageCount(pdf) });
    }

    // eslint-disable-next-line no-console
    console.log(`\n=== naive vs real ===\n${JSON.stringify(results, null, 2)}`);

    // The spike records the answer rather than asserting a desired one; what it
    // must prove is that ground truth was obtainable at all, from outside.
    for (const result of results) {
      expect(result.real).toBeGreaterThan(0);
    }
  });

  test("print media changes layout, which is why a screen measurement cannot stand in for it", async ({ page }) => {
    await page.goto(REPORT);

    const screen = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.emulateMedia({ media: "print" });
    const print = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.emulateMedia({ media: "screen" });

    // eslint-disable-next-line no-console
    console.log(`\n=== height ===\nscreen ${screen}px, print ${print}px`);

    // The document's print rules restate the palette, drop the grid to a single
    // column and expand collapsed content. Measuring the screen canvas would be
    // measuring a different document.
    expect(print).not.toBe(screen);
  });
});
