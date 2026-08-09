import { FrwdDocument } from "@frwd/format";
import { checkNativeConformance, inspect, sanitize } from "@frwd/sanitize";
import { describe, expect, it } from "vitest";
import { distinctCodes, loadFixtures } from "../harness/fixtures.js";

/**
 * The native safety profile, across the whole fixture corpus.
 *
 * Every fixture is held to the profile, not only the ones written to break it -
 * so a stray remote URL in a designed reference document fails here rather than
 * shipping.
 */

const fixtures = loadFixtures();

describe("security corpus", () => {
  it("contains documents that violate the profile", () => {
    expect(fixtures.filter((fixture) => !fixture.expectations.profileConforming).length).toBeGreaterThan(0);
  });
});

for (const fixture of fixtures) {
  const { expectations } = fixture;
  const options = expectations.inspectOptions ?? {};

  describe(fixture.name, () => {
    it("produces exactly the expected profile diagnostics", () => {
      const document = FrwdDocument.parse(fixture.source);
      expect(distinctCodes(inspect(document.tree, options))).toEqual(
        [...expectations.expectedProfileDiagnostics].sort(),
      );
    });

    it("does not change the document while inspecting it", () => {
      // Reading an unsafe file is not consent to have it rewritten.
      const document = FrwdDocument.parse(fixture.source);
      const before = document.toHtml();
      inspect(document.tree, options);
      expect(document.toHtml()).toBe(before);
    });

    it("composes structural and profile conformance", () => {
      const document = FrwdDocument.parse(fixture.source);
      const result = checkNativeConformance(document, options);

      expect(result.isConforming).toBe(expectations.conforming && expectations.profileConforming);
      expect(distinctCodes(result.structural)).toEqual([...expectations.expectedDiagnostics].sort());
      expect(distinctCodes(result.profile)).toEqual([...expectations.expectedProfileDiagnostics].sort());
    });

    if (!expectations.profileConforming) {
      it("is brought inside the profile by sanitize, which reports every change", () => {
        const document = FrwdDocument.parse(fixture.source);
        const report = sanitize(document.tree, options);

        expect(report.changes.length).toBeGreaterThan(0);
        expect(report.remaining.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
        expect(inspect(document.tree, options).filter((d) => d.severity === "error")).toEqual([]);
      });

      it("still parses as a FRWD document after sanitization", () => {
        const document = FrwdDocument.parse(fixture.source);
        sanitize(document.tree, options);

        const reopened = FrwdDocument.parse(document.toHtml());
        expect(reopened.documentId).toBe(document.documentId);
        expect(reopened.root).toBeDefined();
      });
    }
  });
}
