import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { buildSync } from "esbuild";
import { publishFixture } from "./support/publications.js";

/**
 * The editor's region model, against real documents in a real browser.
 *
 * These are the regressions ADR 0001 rests on. If the region editor can be
 * mounted on a block and taken off again without the document noticing, the
 * architecture holds; if it cannot, nothing built on top of it is trustworthy.
 */

const here = dirname(fileURLToPath(import.meta.url));
const BUNDLE = buildSync({
  entryPoints: [resolve(here, "..", "..", "apps", "editor", "src", "core", "browser-harness.ts")],
  bundle: true,
  format: "iife",
  target: "es2022",
  write: false,
}).outputFiles[0]!.text;

interface Harness {
  roundTripAll(): { id: string; tag: string; before: string; after: string; equal: boolean }[];
  mountAndUnmount(id: string): { attributesPreserved: boolean; htmlPreserved: boolean; added: string[] };
  editText(id: string, replacement: string): { html: string; opaqueCount: number };
}

declare global {
  interface Window {
    frwdHarness: Harness;
  }
}

async function load(page: import("@playwright/test").Page, fixture: string): Promise<void> {
  await page.goto(publishFixture(fixture));
  await page.addScriptTag({ content: BUNDLE });
}

test.describe("region round trip", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Measures the editor's own model, not engine behaviour.");

  for (const fixture of [
    { name: "business-report/annual-review", label: "business report" },
    { name: "rich-manual/field-calibration", label: "rich manual" },
    { name: "scientific/saturation-kinetics", label: "scientific paper" },
  ] as const) {
    test(`${fixture.label}: every editable block survives parse and serialize unchanged`, async ({ page }) => {
      await load(page, fixture.name);

      const results = await page.evaluate(() => window.frwdHarness.roundTripAll());
      expect(results.length).toBeGreaterThan(5);

      const changed = results.filter((result) => !result.equal);
      expect(
        changed.map((result) => `${result.tag}#${result.id}\n  before: ${result.before}\n  after:  ${result.after}`),
      ).toEqual([]);
    });
  }

  test("inline MathML survives as an opaque object while the text around it changes", async ({ page }) => {
    // The nastiest case in the corpus: a paragraph with inline MathML in the
    // middle of ordinary prose. The maths must come back byte-identical from a
    // model that has no idea what it is.
    await load(page, "scientific/saturation-kinetics");

    const before = await page.evaluate(() =>
      window.frwdHarness.roundTripAll().find((result) => result.before.includes("<math")),
    );
    expect(before, "expected a paragraph containing inline MathML").toBeDefined();
    expect(before!.equal).toBe(true);

    const edited = await page.evaluate((id) => window.frwdHarness.editText(id, "REPLACED"), before!.id);

    expect(edited.opaqueCount).toBeGreaterThan(0);
    expect(edited.html).toContain("REPLACED");
    // The maths is still there, still MathML, still with its own structure.
    expect(edited.html).toContain("<math");
    expect(edited.html).toMatch(/<mi>[θτ]<\/mi>/);
  });
});

test.describe("mounting is chrome, not document state", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Measures the editor's own model, not engine behaviour.");

  for (const fixture of [
    { name: "business-report/annual-review", label: "business report" },
    { name: "rich-manual/field-calibration", label: "rich manual" },
  ] as const) {
    test(`${fixture.label}: mounting and unmounting leaves the block exactly as it was`, async ({ page }) => {
      await load(page, fixture.name);

      const blocks = await page.evaluate(() => window.frwdHarness.roundTripAll().map((result) => result.id));
      const sample = blocks.slice(0, 6);
      expect(sample.length).toBeGreaterThan(3);

      for (const id of sample) {
        const result = await page.evaluate((blockId) => window.frwdHarness.mountAndUnmount(blockId), id);
        expect(result.added, `block ${id} kept editor chrome`).toEqual([]);
        expect(result.attributesPreserved, `block ${id} lost or gained an attribute`).toBe(true);
        expect(result.htmlPreserved, `block ${id} content changed without an edit`).toBe(true);
      }
    });
  }
});
