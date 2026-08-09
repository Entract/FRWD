import { FrwdDocument } from "@frwd/format";
import { describe, expect, it } from "vitest";
import { distinctCodes, loadFixtures } from "../harness/fixtures.js";

/**
 * Every fixture, against the format spec.
 *
 * The design pack says to write conformance fixtures early, before the editor
 * exists - the format is the product, so its guarantees get tested first.
 */

const fixtures = loadFixtures();

describe("fixture corpus", () => {
  it("is not empty", () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it("contains the minimal reference document", () => {
    expect(fixtures.map((fixture) => fixture.name)).toContain("minimal/minimal");
  });
});

for (const fixture of fixtures) {
  describe(fixture.name, () => {
    it("parses without throwing", () => {
      expect(() => FrwdDocument.parse(fixture.source)).not.toThrow();
    });

    it(`reports itself ${fixture.expectations.conforming ? "conforming" : "non-conforming"}`, () => {
      const document = FrwdDocument.parse(fixture.source);
      expect(document.isConforming).toBe(fixture.expectations.conforming);
    });

    it("produces exactly the expected diagnostics", () => {
      const document = FrwdDocument.parse(fixture.source);
      expect(distinctCodes(document.diagnostics)).toEqual([...fixture.expectations.expectedDiagnostics].sort());
    });

    if (fixture.expectations.canonical) {
      it("matches reference canonical serialization, so a no-op save produces no diff", () => {
        // A property of our writer rather than of FRWD (spec section 21),
        // checked against a real file on disk rather than a string in a test.
        // Run `pnpm fixtures:canonicalize` if this fails after an edit.
        expect(FrwdDocument.parse(fixture.source).toHtml()).toBe(fixture.source);
      });
    }
  });
}
