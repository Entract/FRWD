import { describe, expect, it } from "vitest";
import { FrwdDocument } from "../src/index.js";
import { MINIMAL, WITH_ASSET } from "./fixtures.js";

/**
 * Semantic round-trip stability and deterministic serialization.
 *
 * These are the contract of the package. Exact original whitespace and
 * attribute formatting are explicitly NOT invariants: parsing normalizes a
 * document once, and every save after that is byte-identical.
 */
describe("round trip", () => {
  it("is idempotent after the first save", () => {
    const first = FrwdDocument.parse(MINIMAL).toHtml();
    const second = FrwdDocument.parse(first).toHtml();
    const third = FrwdDocument.parse(second).toHtml();

    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("produces the same bytes from the same input every time", () => {
    const runs = Array.from({ length: 5 }, () => FrwdDocument.parse(MINIMAL).toHtml());
    expect(new Set(runs).size).toBe(1);
  });

  it("preserves document identity, structure, content, CSS and metadata", () => {
    const original = FrwdDocument.parse(MINIMAL);
    const saved = FrwdDocument.parse(original.toHtml());

    expect(saved.documentId).toBe(original.documentId);
    expect(saved.title).toBe(original.title);
    expect(saved.manifest).toEqual(original.manifest);
    expect(saved.css).toBe(original.css);
    expect([...saved.identified.keys()]).toEqual([...original.identified.keys()]);
    expect(saved.isConforming).toBe(true);
  });

  it("preserves every stable id, in document order", () => {
    const document = FrwdDocument.parse(MINIMAL);
    const ids = [...document.identified.keys()];

    expect(ids).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ]);

    expect([...FrwdDocument.parse(document.toHtml()).identified.keys()]).toEqual(ids);
  });

  it("preserves embedded asset metadata", () => {
    const original = FrwdDocument.parse(WITH_ASSET);
    const saved = FrwdDocument.parse(original.toHtml());

    expect(original.assets).toHaveLength(1);
    expect(saved.assets).toEqual(original.assets);
  });

  it("does not reindent, because whitespace in flow content is significant", () => {
    const source = `<!doctype html><html data-frwd-version="0.1"><head><script type="application/frwd+json" id="frwd-manifest">{"format":"frwd","version":"0.1","documentId":"d","title":"t","created":"2026-08-09T09:00:00Z","modified":"2026-08-09T09:00:00Z"}</script></head><body><main data-frwd-document><p data-frwd-id="a">one <em>two</em> three</p></main></body></html>`;

    expect(FrwdDocument.parse(source).toHtml()).toContain(
      `<p data-frwd-id="a">one <em>two</em> three</p>`,
    );
  });

  it("preserves text exactly, including entities and non-ASCII", () => {
    const document = FrwdDocument.parse(
      MINIMAL.replace("Flow &amp; reflow, in one file.", "Flow &amp; reflow — naïve &lt;tags&gt; too."),
    );
    const paragraph = document.getElementById("33333333-3333-4333-8333-333333333333");

    expect(paragraph).toBeDefined();
    expect(document.toHtml()).toContain("Flow &amp; reflow — naïve &lt;tags&gt; too.");
  });

  it("keeps the doctype", () => {
    expect(FrwdDocument.parse(MINIMAL).toHtml().startsWith("<!DOCTYPE html>")).toBe(true);
  });

  it("adds no cosmetic trailing newline, which a re-parse would absorb into the body", () => {
    // Text after </html> is not outside the document: the HTML5 parser moves it
    // into <body>. A serializer that appends a newline therefore grows the
    // document's content by one newline on every save.
    expect(FrwdDocument.parse(MINIMAL).toHtml().endsWith("</html>")).toBe(true);
  });

  it("absorbs a foreign trailing newline once, then stays stable", () => {
    const first = FrwdDocument.parse(`${MINIMAL}\n\n`).toHtml();
    expect(FrwdDocument.parse(first).toHtml()).toBe(first);
  });
});
