import { describe, expect, it } from "vitest";
import { FrwdDocument, canonicalizeAttributes, serializeDocument } from "../src/index.js";
import { MINIMAL, WITH_ASSET } from "./fixtures.js";

describe("FrwdDocument", () => {
  it("accepts a conforming document", () => {
    const document = FrwdDocument.parse(MINIMAL);
    expect(document.isConforming).toBe(true);
    expect(document.errors).toEqual([]);
    expect(document.root?.tagName).toBe("main");
  });

  it("never throws on malformed input", () => {
    for (const junk of ["", "not html at all", "<html><body><p>unclosed", "<<<>>>"]) {
      expect(() => FrwdDocument.parse(junk)).not.toThrow();
    }
  });

  it("reports a missing document root", () => {
    const document = FrwdDocument.parse(MINIMAL.replace("<main data-frwd-document>", "<main>"));
    expect(document.errors.map((error) => error.code)).toContain("missing-document-root");
  });

  it("reports a missing version marker", () => {
    const document = FrwdDocument.parse(MINIMAL.replace(' data-frwd-version="0.1"', ""));
    expect(document.errors.map((error) => error.code)).toContain("missing-version");
  });

  it("warns on a newer minor version but errors on a newer major", () => {
    const minor = FrwdDocument.parse(MINIMAL.replace('data-frwd-version="0.1"', 'data-frwd-version="0.2"'));
    expect(minor.diagnostics.find((d) => d.code === "version-mismatch")?.severity).toBe("warning");

    const major = FrwdDocument.parse(MINIMAL.replace('data-frwd-version="0.1"', 'data-frwd-version="1.0"'));
    expect(major.diagnostics.find((d) => d.code === "version-mismatch")?.severity).toBe("error");
  });

  it("warns about a quirks-mode document", () => {
    const document = FrwdDocument.parse(MINIMAL.replace("<!doctype html>\n", ""));
    expect(document.diagnostics.map((d) => d.code)).toContain("missing-doctype");
  });

  it("warns about an id outside the document root", () => {
    const document = FrwdDocument.parse(MINIMAL.replace("<title>", '<title data-frwd-id="stray">'));
    expect(document.diagnostics.map((d) => d.code)).toContain("id-outside-document-root");
  });

  it("exposes and replaces document CSS", () => {
    const document = FrwdDocument.parse(MINIMAL);
    expect(document.css).toContain("max-width: 34rem");

    document.css = "main { max-width: 40rem; }";
    expect(FrwdDocument.parse(document.toHtml()).css).toBe("main { max-width: 40rem; }");
  });

  it("refuses to invent a style element that the document does not have", () => {
    const document = FrwdDocument.parse(MINIMAL.replace('id="frwd-document-style"', 'id="other"'));
    expect(() => {
      document.css = "p {}";
    }).toThrow(/no <style/);
  });

  it("reads asset metadata", () => {
    const [asset] = FrwdDocument.parse(WITH_ASSET).assets;
    expect(asset).toMatchObject({ id: "asset-123", mediaType: "video/mp4", bytes: 18422312 });
  });

  it("warns when an asset id disagrees with its wrapper", () => {
    const document = FrwdDocument.parse(WITH_ASSET.replace('data-frwd-asset-id="asset-123"', 'data-frwd-asset-id="other"'));
    expect(document.diagnostics.map((d) => d.code)).toContain("asset-id-mismatch");
  });
});

describe("attribute canonicalization", () => {
  it("puts the stable id first, then sorts the rest", () => {
    const source = `<!doctype html><html data-frwd-version="0.1"><body><main data-frwd-document><p class="lead" lang="en" data-frwd-id="a" title="t">x</p></main></body></html>`;
    expect(FrwdDocument.parse(source).toHtml()).toContain(
      `<p data-frwd-id="a" class="lead" lang="en" title="t">x</p>`,
    );
  });

  it("is idempotent", () => {
    const document = FrwdDocument.parse(MINIMAL);
    const once = serializeDocument(document.tree);
    canonicalizeAttributes(document.tree);
    expect(serializeDocument(document.tree)).toBe(once);
  });
});
