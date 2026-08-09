import { FrwdDocument, findElement, getAttr, textContent } from "@frwd/format";
import { inspectPublication, publish, RUNTIME_SCRIPT_ID, RUNTIME_VERSION } from "@frwd/publisher";
import { RUNTIME_SOURCE } from "@frwd/runtime";
import { describe, expect, it } from "vitest";

const DOCUMENT_ID = "a2000000-0000-4000-8000-000000000001";

function build(body = `<p data-frwd-id="p1">Readable prose.</p>`, head = "", style = "body { margin: 0; }"): FrwdDocument {
  return FrwdDocument.parse(`<!DOCTYPE html><html data-frwd-version="0.1" lang="en">
<head>
<meta charset="utf-8">
<title>Publication</title>
<script id="frwd-manifest" type="application/frwd+json">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Publication",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
<style id="frwd-document-style">${style}</style>
${head}
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="a2000000-0000-4000-8000-000000000002">
<h1 data-frwd-id="a2000000-0000-4000-8000-000000000003">Publication</h1>
${body}
</article>
</main>
</body>
</html>`);
}

describe("publish", () => {
  it("emits one self-contained file containing the document and the runtime", () => {
    const result = publish(build());

    expect(result.ok).toBe(true);
    expect(result.html).toContain("Readable prose.");
    expect(result.html).toContain("body { margin: 0; }");
    expect(result.html).toContain(`id="${RUNTIME_SCRIPT_ID}"`);
    expect(result.runtimeVersion).toBe(RUNTIME_VERSION);
  });

  it("declares its runtime version and publication profile", () => {
    const html = publish(build()).html ?? "";
    expect(html).toContain(`content="${RUNTIME_VERSION}" name="frwd-runtime-version"`);
    expect(html).toContain(`content="read" name="frwd-publication-profile"`);
  });

  it("preserves the document exactly: semantics, ids, CSS and metadata", () => {
    const document = build();
    const published = FrwdDocument.parse(publish(document).html ?? "");

    expect(published.documentId).toBe(document.documentId);
    expect(published.css).toBe(document.css);
    expect([...published.identified.keys()]).toEqual([...document.identified.keys()]);
    expect(published.root).toBeDefined();
  });

  it("does not disturb the document it published", () => {
    const document = build();
    const before = document.toHtml();
    publish(document);
    expect(document.toHtml()).toBe(before);
  });

  it("is deterministic", () => {
    const runs = Array.from({ length: 3 }, () => publish(build()).html);
    expect(new Set(runs).size).toBe(1);
  });

  it("embeds a classic script, because a module script cannot load from file://", () => {
    // A module script is fetched with CORS and a file:// origin is opaque, so a
    // module runtime would not run in the one place a publication most needs
    // to: a file someone was emailed.
    const html = publish(build()).html ?? "";
    const scriptTag = html.slice(html.indexOf(`<script id="${RUNTIME_SCRIPT_ID}"`));
    expect(scriptTag.slice(0, scriptTag.indexOf(">"))).not.toContain("type=");
  });

  it("embeds the runtime as readable source", () => {
    const html = publish(build()).html ?? "";
    expect(html).toContain("FRWD runtime");
    expect(html).toContain("installFrwdRuntime");
    expect(html).toContain("data-frwd-hydrated");
  });

  it("stays readable with JavaScript disabled", () => {
    // Strip every script, as a browser with scripting off effectively does,
    // and the document must be exactly as legible as before publishing.
    const document = build();
    const withoutScripts = (publish(document).html ?? "").replace(/<script[\s\S]*?<\/script>/g, "");
    const published = FrwdDocument.parse(withoutScripts);

    expect(textContent(published.root!)).toBe(textContent(document.root!));
    expect(published.css).toBe(document.css);
    expect([...published.identified.keys()]).toEqual([...document.identified.keys()]);
  });

  it("adds no stylesheet rule that could hide document content", () => {
    // The runtime stylesheet must only address states the runtime itself sets.
    // A rule that hid content unconditionally would break the promise above
    // without touching a single script.
    const html = publish(build()).html ?? "";
    const style = findElement(
      FrwdDocument.parse(html).tree,
      (element) => element.tagName === "style" && getAttr(element, "id") === "frwd-runtime-style",
    );

    const selectors = textContent(style!)
      .split("{")
      .map((part) => part.split("}").pop()?.trim() ?? "")
      .filter((part) => part !== "" && !part.startsWith("@") && !part.includes(":"));

    for (const selector of selectors) {
      expect(selector).toContain("[data-frwd-");
    }
  });
});

describe("publishing does not launder a document's own script", () => {
  it("refuses a source document that breaks the safety profile", () => {
    const result = publish(build(`<p data-frwd-id="p1">x</p><script>alert(1)</script>`));

    expect(result.ok).toBe(false);
    expect(result.html).toBeUndefined();
    expect(result.errors.map((error) => error.code)).toContain("executable-script");
  });

  it("refuses a source document that is structurally broken", () => {
    const result = publish(build(`<p>no id</p>`));
    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("missing-stable-id");
  });

  it("refuses a document that would fetch on open", () => {
    const result = publish(build(`<p data-frwd-id="p1"><img alt="x" src="https://example.invalid/p.png"></p>`));
    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("external-resource");
  });
});

describe("inspectPublication", () => {
  it("trusts a file this publisher produced", () => {
    const report = inspectPublication(publish(build()).html ?? "");

    expect(report.isTrusted).toBe(true);
    expect(report.diagnostics).toEqual([]);
    expect(report.declaredRuntimeVersion).toBe(RUNTIME_VERSION);
  });

  it("refuses a publication with an extra script", () => {
    const html = (publish(build()).html ?? "").replace("</body>", "<script>alert(1)</script></body>");
    const report = inspectPublication(html);

    expect(report.isTrusted).toBe(false);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("untrusted-script");
  });

  it("refuses a runtime script whose content was altered", () => {
    // The whole point: the file says it carries the standard runtime, and it
    // does not. A publication is ordinary HTML and anyone can edit it.
    const html = (publish(build()).html ?? "").replace(
      "installFrwdRuntime",
      "installFrwdRuntime; fetch('https://example.invalid');",
    );
    const report = inspectPublication(html);

    expect(report.isTrusted).toBe(false);
    expect(report.diagnostics[0]?.code).toBe("untrusted-script");
  });

  it("still applies the rest of the profile around the runtime", () => {
    const html = (publish(build()).html ?? "").replace("<h1 ", '<h1 onclick="alert(1)" ');
    const report = inspectPublication(html);

    expect(report.isTrusted).toBe(false);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("event-handler-attribute");
  });

  it("notices a second runtime", () => {
    const html = (publish(build()).html ?? "").replace(
      "</body>",
      `<script id="${RUNTIME_SCRIPT_ID}">\n${RUNTIME_SOURCE}</script></body>`,
    );
    expect(inspectPublication(html).diagnostics.map((d) => d.code)).toContain("duplicate-runtime");
  });

  it("warns when a runtime travels without a declared version", () => {
    const html = (publish(build()).html ?? "").replace(/<meta content="[^"]*" name="frwd-runtime-version">/, "");
    const report = inspectPublication(html);

    expect(report.diagnostics.map((d) => d.code)).toContain("missing-runtime-version");
    expect(report.isTrusted).toBe(true);
  });
});

describe("the embedded runtime", () => {
  it("is syntactically valid JavaScript", () => {
    // Compiled, not executed: there is no DOM here. Behaviour is verified in
    // real browsers by the cross-browser suite.
    expect(() => new Function(RUNTIME_SOURCE)).not.toThrow();
  });

  it("contains no network access of any kind", () => {
    for (const forbidden of ["fetch(", "XMLHttpRequest", "WebSocket", "importScripts", "navigator.sendBeacon", "import("]) {
      expect(RUNTIME_SOURCE).not.toContain(forbidden);
    }
  });

  it("carries its licence and version", () => {
    expect(RUNTIME_SOURCE).toContain(`FRWD runtime ${RUNTIME_VERSION}`);
    expect(RUNTIME_SOURCE).toContain("Apache-2.0");
  });

  it("is not minified", () => {
    expect(RUNTIME_SOURCE.split("\n").length).toBeGreaterThan(50);
  });
});
