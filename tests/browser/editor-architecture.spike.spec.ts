import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { buildSync } from "esbuild";
import { publishFixture } from "./support/publications.js";

/**
 * Architecture spike for t-024, kept as a test so the answer stays checkable.
 *
 * The question: can a structured editor's document model own the whole FRWD
 * document, or must the validated FRWD DOM stay authoritative?
 *
 * ProseMirror stands in for that whole class of engine - Tiptap wraps it, and
 * every schema-constrained editor makes the same trade. The schema used here is
 * deliberately generous (basic plus lists, what a real editor starts from), so
 * the result is not made worse than the honest case.
 *
 * Each fixture is opened, parsed into the editor model, and serialized back
 * with **no edit at all**. Whatever does not come back is what that
 * architecture would cost FRWD on every single open.
 */

// Bundled here rather than committed: the spike is source plus a build step,
// so nobody has to wonder whether a checked-in artifact matches the code.
const BUNDLE = buildSync({
  entryPoints: [resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "spikes", "structured-editor", "entry.js")],
  bundle: true,
  format: "iife",
  target: "es2022",
  write: false,
}).outputFiles[0]!.text;

const FIXTURES = [
  { name: "business-report/annual-review", label: "business report" },
  { name: "rich-manual/field-calibration", label: "rich manual" },
  { name: "scientific/saturation-kinetics", label: "scientific paper" },
] as const;

interface SpikeResult {
  error: string | null;
  ids: { before: number; after: number; lost: number };
  classes: { before: number; after: number };
  dataAttributes: { before: number; after: number };
  elements: Record<string, { before: number; after: number }>;
  textPreserved: boolean;
  textBeforeLength: number;
  textAfterLength: number;
}

// Chromium only: this measures a JavaScript library's behaviour, not the
// browser's, so running it three times would tell us the same thing three
// times.
test.describe("structured editor round trip", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Measures library behaviour, not engine behaviour.");

  for (const fixture of FIXTURES) {
    test(`${fixture.label}: what survives a whole-document editor model`, async ({ page }) => {
      await page.goto(publishFixture(fixture.name));
      await page.addScriptTag({ content: BUNDLE });

      const result = (await page.evaluate(() =>
        (window as unknown as { frwdSpike: () => SpikeResult }).frwdSpike(),
      )) as SpikeResult;

      // eslint-disable-next-line no-console
      console.log(`\n=== ${fixture.label} ===\n${JSON.stringify(result, null, 2)}`);

      // The spike records the answer rather than asserting a desired one. The
      // single assertion that matters is that it ran and had something to
      // measure; the numbers are the finding, and they live in the ADR.
      expect(result.ids.before).toBeGreaterThan(10);
    });
  }
});
