import { FrwdDocument, findElement, getAttr, setTextContent } from "@frwd/format";
import { describe, expect, it } from "vitest";
import { checkNativeConformance, inspect, inspectCss, sanitize, stripRemoteCss } from "../src/index.js";

const DOCUMENT_ID = "d0000000-0000-4000-8000-000000000001";

/** A conforming document with `body` spliced into the article. */
function build(body: string, head = "", style = ""): string {
  return `<!DOCTYPE html><html data-frwd-version="0.1" lang="en">
<head>
<meta charset="utf-8">
<title>Profile test</title>
<script id="frwd-manifest" type="application/frwd+json">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Profile test",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
${style ? `<style id="frwd-document-style">${style}</style>` : ""}
${head}
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="d0000000-0000-4000-8000-000000000002">
<h1 data-frwd-id="d0000000-0000-4000-8000-000000000003">Profile test</h1>
${body}
</article>
</main>
</body>
</html>`;
}

const codes = (document: FrwdDocument): string[] => [...new Set(inspect(document.tree).map((d) => d.code))].sort();

describe("script elements", () => {
  it("accepts the inert FRWD data types", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1">x</p>
<script data-frwd-asset-id="a" type="application/frwd-asset+json">{"id":"a"}</script>`),
    );
    expect(codes(document)).toEqual([]);
  });

  it("accepts an inert dataset block, which the rich media spec requires", () => {
    const document = FrwdDocument.parse(
      build(
        `<p data-frwd-id="p1">x</p>
<script id="dataset-1" type="application/frwd-dataset+json">{"columns":["q"],"rows":[["Q1"]]}</script>`,
      ),
    );
    expect(codes(document)).toEqual([]);
  });

  it("rejects any other type, inert or not", () => {
    // text/plain does not execute, but a reader cannot rely on that, and a
    // profile that admits exceptions is a profile nobody can verify.
    for (const type of ["", ' type="text/javascript"', ' type="module"', ' type="text/plain"']) {
      const document = FrwdDocument.parse(build(`<p data-frwd-id="p1">x</p><script${type}>1</script>`));
      expect(codes(document)).toContain("executable-script");
    }
  });

  it("rejects inert content that could close its own element", () => {
    // Not reachable by parsing: the HTML parser ends a script element at the
    // first `</script`, so a document read from disk cannot contain this. It is
    // reachable by building a tree in memory - an editor or an AI operation
    // writing metadata - and serializing it would split the document in two.
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1">x</p>
<script data-frwd-asset-id="a" type="application/frwd-asset+json">{"id":"a"}</script>`),
    );

    const asset = findElement(
      document.tree,
      (element) => element.tagName === "script" && getAttr(element, "data-frwd-asset-id") === "a",
    );
    setTextContent(asset!, '{"id":"a","title":"</script><script>alert(1)"}');

    expect(codes(document)).toContain("script-content-escape");
  });

  it("clears such content when sanitizing, without removing the block", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1">x</p>
<script data-frwd-asset-id="a" type="application/frwd-asset+json">{"id":"a"}</script>`),
    );
    const asset = findElement(
      document.tree,
      (element) => element.tagName === "script" && getAttr(element, "data-frwd-asset-id") === "a",
    );
    setTextContent(asset!, '{"id":"a","title":"</script>"}');

    const report = sanitize(document.tree);
    expect(report.changes.map((change) => change.code)).toEqual(["script-content-escape"]);
    expect(document.toHtml()).toContain('data-frwd-asset-id="a"');
    expect(report.remaining).toEqual([]);
  });
});

describe("URLs in markup", () => {
  it("permits an external hyperlink, because following it is a user action", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><a href="https://example.invalid/">Read more</a></p>`),
    );
    expect(codes(document)).toEqual([]);
  });

  it("rejects an image that would be fetched without asking", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><img alt="x" src="https://example.invalid/p.png"></p>`),
    );
    expect(codes(document)).toEqual(["external-resource"]);
  });

  it("checks every candidate in a srcset", () => {
    const document = FrwdDocument.parse(
      build(
        `<p data-frwd-id="p1"><img alt="x" src="data:image/png;base64,AAAA" srcset="data:image/png;base64,AAAA 1x, https://example.invalid/b.png 2x"></p>`,
      ),
    );
    expect(codes(document)).toEqual(["external-resource"]);
  });

  it("accepts embedded media", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><img alt="x" src="data:image/png;base64,AAAA"></p>`),
    );
    expect(codes(document)).toEqual([]);
  });
});

describe("CSS", () => {
  it("finds an @import wherever it hides", () => {
    expect(inspectCss('@import "theme.css";').map((f) => f.kind)).toEqual(["import"]);
    expect(inspectCss('@import url("https://example.invalid/t.css") screen;').map((f) => f.kind)).toEqual(["import"]);
  });

  it("finds a remote url() in any property", () => {
    const findings = inspectCss("a { background: url(https://example.invalid/x.png) no-repeat; }");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.context).toBe("background");
  });

  it("finds a remote url() inside an at-rule", () => {
    const findings = inspectCss('@font-face { src: url("https://example.invalid/f.woff2"); }');
    expect(findings.map((f) => f.kind)).toEqual(["external-url"]);
  });

  it("leaves embedded and local references alone", () => {
    expect(inspectCss("a { background: url(data:image/png;base64,AAAA); }")).toEqual([]);
    expect(inspectCss("a { clip-path: url(#mask); }")).toEqual([]);
  });

  it("reports CSS it cannot parse rather than pretending it is clean", () => {
    expect(inspectCss("a { color: ").map((f) => f.kind)).toEqual(["parse-error"]);
  });

  it("fails closed on unparseable CSS: it is an error, and nothing survives sanitization", () => {
    // CSS we cannot parse is CSS we cannot clear of making external requests.
    const document = FrwdDocument.parse(build(`<p data-frwd-id="p1">x</p>`, "", "body { color: red;\n@media screen {"));
    const diagnostic = inspect(document.tree).find((d) => d.code === "css-parse-error");

    expect(diagnostic?.severity).toBe("error");

    const { css, removed } = stripRemoteCss("body { color: red;\n@media screen {");
    expect(removed.map((f) => f.kind)).toEqual(["parse-error"]);
    expect(css).toBe("");
  });

  it("strips remote references and keeps the rest", () => {
    const { css, removed } = stripRemoteCss(
      '@import "x.css";\nbody { color: red; background: url(https://example.invalid/b.png); margin: 0; }',
    );
    expect(removed).toHaveLength(2);
    expect(css).toContain("color: red");
    expect(css).toContain("margin: 0");
    expect(css).not.toContain("example.invalid");
    expect(css).not.toContain("@import");
  });
});

describe("closed surfaces", () => {
  it("forbids a form, because forms are deferred and unbudgeted for", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1">x</p><form action="/x"><button type="submit">Send</button></form>`),
    );
    expect(codes(document)).toContain("forbidden-element");
  });

  it("forbids a link element, which could load a stylesheet nobody inspected", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1">x</p>`, `<link href="https://example.invalid/t.css" rel="stylesheet">`),
    );
    expect(codes(document)).toContain("forbidden-element");
  });

  it("rejects formaction and ping wherever they appear", () => {
    const withFormaction = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><button formaction="https://example.invalid/x">Send</button></p>`),
    );
    expect(codes(withFormaction)).toEqual(["forbidden-attribute"]);

    const withPing = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><a href="https://example.invalid/" ping="https://example.invalid/t">x</a></p>`),
    );
    expect(codes(withPing)).toEqual(["forbidden-attribute"]);
  });

  it("removes those attributes when sanitizing, keeping the link itself", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><a href="https://example.invalid/" ping="https://example.invalid/t">Read</a></p>`),
    );
    const report = sanitize(document.tree);

    expect(report.changes.map((change) => change.code)).toEqual(["forbidden-attribute"]);
    expect(document.toHtml()).toContain('href="https://example.invalid/"');
    expect(document.toHtml()).not.toContain("ping=");
  });
});

describe("inspect never mutates", () => {
  const hostile = build(
    `<p data-frwd-id="p1" onclick="alert(1)"><a href="javascript:alert(1)">x</a><img alt="y" src="https://example.invalid/p.png"></p>
<script>alert(1)</script>`,
    `<base href="https://example.invalid/">`,
    "@import 'x.css';",
  );

  it("leaves the document byte-identical", () => {
    const document = FrwdDocument.parse(hostile);
    const before = document.toHtml();
    inspect(document.tree);
    inspect(document.tree);
    expect(document.toHtml()).toBe(before);
  });

  it("reports every violation at once", () => {
    const document = FrwdDocument.parse(hostile);
    expect(codes(document)).toEqual(
      ["css-import", "event-handler-attribute", "executable-script", "external-resource", "forbidden-element", "unsafe-url-scheme"].sort(),
    );
  });
});

describe("sanitize", () => {
  const hostile = build(
    `<p data-frwd-id="p1" onclick="alert(1)">Kept text <a href="javascript:alert(1)">link</a></p>
<script>alert(1)</script>`,
  );

  it("removes only what the profile forbids", () => {
    const document = FrwdDocument.parse(hostile);
    sanitize(document.tree);

    const html = document.toHtml();
    expect(html).toContain("Kept text");
    expect(html).toContain("link");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("alert(1)");
  });

  it("reports every change, with the id of the block it happened in", () => {
    const document = FrwdDocument.parse(hostile);
    const report = sanitize(document.tree);

    expect(report.changes.map((change) => change.code).sort()).toEqual([
      "event-handler-attribute",
      "executable-script",
      "unsafe-url-scheme",
    ]);
    expect(report.changes.find((change) => change.code === "unsafe-url-scheme")?.elementId).toBe("p1");
    expect(report.remaining).toEqual([]);
  });

  it("is idempotent", () => {
    const document = FrwdDocument.parse(hostile);
    sanitize(document.tree);
    const once = document.toHtml();

    const second = sanitize(document.tree);
    expect(second.changes).toEqual([]);
    expect(document.toHtml()).toBe(once);
  });

  it("does not run unless it is called", () => {
    const document = FrwdDocument.parse(hostile);
    const before = document.toHtml();
    checkNativeConformance(document);
    expect(document.toHtml()).toBe(before);
  });
});

describe("composed conformance", () => {
  it("fails a structurally perfect document that carries a script", () => {
    const document = FrwdDocument.parse(build(`<p data-frwd-id="p1">x</p><script>alert(1)</script>`));
    const result = checkNativeConformance(document);

    expect(document.isConforming).toBe(true);
    expect(result.structural).toEqual([]);
    expect(result.profile.map((d) => d.code)).toEqual(["executable-script"]);
    expect(result.isConforming).toBe(false);
  });

  it("fails an inert document that is structurally broken", () => {
    const document = FrwdDocument.parse(build(`<p>no id</p>`));
    const result = checkNativeConformance(document);

    expect(result.profile).toEqual([]);
    expect(result.structural.map((d) => d.code)).toEqual(["missing-stable-id"]);
    expect(result.isConforming).toBe(false);
  });

  it("passes only when both layers pass", () => {
    const document = FrwdDocument.parse(build(`<p data-frwd-id="p1">x</p>`));
    expect(checkNativeConformance(document).isConforming).toBe(true);
  });

  it("honours a configured data URL limit", () => {
    const document = FrwdDocument.parse(
      build(`<p data-frwd-id="p1"><img alt="x" src="data:image/png;base64,${"A".repeat(400)}"></p>`),
    );

    expect(inspect(document.tree).map((d) => d.code)).toEqual([]);
    expect(inspect(document.tree, { maxDataUrlBytes: 64 }).map((d) => d.code)).toEqual(["oversized-data-url"]);
  });
});
