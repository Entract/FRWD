import { FrwdDocument } from "@frwd/format";
import { describe, expect, it } from "vitest";
import { loadFixtures } from "../harness/fixtures.js";

/**
 * Semantic round-trip stability across the fixture corpus.
 *
 * open -> parse -> serialize -> save -> reopen
 *
 * must preserve document identity, stable node ids, semantic content, document
 * CSS and asset metadata. Deterministic output is asserted alongside it: the
 * same input always produces the same bytes.
 */
for (const fixture of loadFixtures()) {
  describe(fixture.name, () => {
    it("saves identically every time", () => {
      const runs = Array.from({ length: 3 }, () => FrwdDocument.parse(fixture.source).toHtml());
      expect(new Set(runs).size).toBe(1);
    });

    it("is idempotent across repeated open/save cycles", () => {
      const once = FrwdDocument.parse(fixture.source).toHtml();
      const twice = FrwdDocument.parse(once).toHtml();
      const thrice = FrwdDocument.parse(twice).toHtml();

      expect(twice).toBe(once);
      expect(thrice).toBe(once);
    });

    it("preserves document identity, ids, CSS, metadata and assets", () => {
      const original = FrwdDocument.parse(fixture.source);
      const reopened = FrwdDocument.parse(original.toHtml());

      expect(reopened.documentId).toBe(original.documentId);
      expect(reopened.title).toBe(original.title);
      expect(reopened.manifest).toEqual(original.manifest);
      expect(reopened.css).toBe(original.css);
      expect(reopened.assets).toEqual(original.assets);
      expect([...reopened.identified.keys()]).toEqual([...original.identified.keys()]);
    });

    it("does not change its verdict when reopened", () => {
      const original = FrwdDocument.parse(fixture.source);
      const reopened = FrwdDocument.parse(original.toHtml());

      expect(reopened.isConforming).toBe(original.isConforming);
      expect(reopened.diagnostics).toEqual(original.diagnostics);
    });

    it("preserves the visible text of the document", () => {
      const textOf = (html: string): string => {
        const document = FrwdDocument.parse(html);
        const root = document.root;
        return root ? collectText(root).replace(/\s+/g, " ").trim() : "";
      };

      expect(textOf(FrwdDocument.parse(fixture.source).toHtml())).toBe(textOf(fixture.source));
    });
  });
}

/** Local text extraction, so the assertion does not depend on the code under test. */
function collectText(node: unknown): string {
  const current = node as { nodeName?: string; value?: string; childNodes?: unknown[] };
  if (current.nodeName === "#text") return current.value ?? "";
  if (!Array.isArray(current.childNodes)) return "";
  return current.childNodes.map(collectText).join("");
}
