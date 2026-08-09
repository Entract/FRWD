import { FrwdDocument } from "@frwd/format";
import { apply, currentRevision, preview, type OperationEnvelope, type Operation } from "@frwd/operations";
import { describe, expect, it } from "vitest";

const DOCUMENT_ID = "f0000000-0000-4000-8000-000000000001";
const ARTICLE = "f0000000-0000-4000-8000-000000000002";
const HEADING = "f0000000-0000-4000-8000-000000000003";
const FIRST = "f0000000-0000-4000-8000-000000000004";
const SECOND = "f0000000-0000-4000-8000-000000000005";
const LIST = "f0000000-0000-4000-8000-000000000006";
const ITEM = "f0000000-0000-4000-8000-000000000007";

const AT = new Date("2026-08-09T12:00:00Z");

function source(revision?: number): string {
  const revisionLine = revision === undefined ? "" : `,\n  "revision": ${revision}`;
  return `<!DOCTYPE html><html data-frwd-version="0.1" lang="en">
<head>
<meta charset="utf-8">
<title>Operations</title>
<script id="frwd-manifest" type="application/frwd+json">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Operations",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"${revisionLine}
}
</script>
<style id="frwd-document-style">body { margin: 0; }</style>
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="${ARTICLE}">
<h1 data-frwd-id="${HEADING}">Operations</h1>
<p data-frwd-id="${FIRST}">First paragraph with <strong>emphasis</strong> inside.</p>
<p data-frwd-id="${SECOND}">Second paragraph.</p>
<ul data-frwd-id="${LIST}">
<li data-frwd-id="${ITEM}">One item.</li>
</ul>
</article>
</main>
</body>
</html>`;
}

function load(revision?: number): FrwdDocument {
  return FrwdDocument.parse(source(revision));
}

function envelope(operations: Operation[], overrides: Partial<OperationEnvelope> = {}): OperationEnvelope {
  return {
    protocol: "frwd-ops",
    version: "0.1",
    documentId: DOCUMENT_ID,
    baseRevision: 0,
    operations,
    ...overrides,
  };
}

let counter = 0;
const ids = (): (() => string) => {
  counter = 0;
  return () => `new-${++counter}`;
};

describe("envelope validation", () => {
  it("rejects the wrong protocol or a future major version", () => {
    const document = load();
    expect(apply(document, envelope([{ op: "delete_node", target: SECOND }], { protocol: "other" as never })).errors[0]?.code).toBe(
      "bad-protocol",
    );
    expect(apply(document, envelope([{ op: "delete_node", target: SECOND }], { version: "1.0" })).errors[0]?.code).toBe(
      "unsupported-protocol-version",
    );
  });

  it("rejects operations aimed at a different document", () => {
    const result = apply(load(), envelope([{ op: "delete_node", target: SECOND }], { documentId: "other" }));
    expect(result.errors.map((error) => error.code)).toContain("document-id-mismatch");
  });

  it("reads an absent revision as 0", () => {
    expect(currentRevision(load())).toBe(0);
    expect(currentRevision(load(7))).toBe(7);
  });

  it("rejects a stale transaction", () => {
    const result = apply(load(7), envelope([{ op: "delete_node", target: SECOND }], { baseRevision: 6 }));
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("stale-revision");
  });

  it("rejects an empty transaction", () => {
    expect(apply(load(), envelope([])).errors[0]?.code).toBe("empty-transaction");
  });
});

describe("targets", () => {
  it("rejects a target that is not in the document", () => {
    const result = apply(load(), envelope([{ op: "delete_node", target: "nope" }]));
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("unknown-target");
  });

  it("refuses to commit against an ambiguous target", () => {
    const document = FrwdDocument.parse(source().replace(`data-frwd-id="${SECOND}"`, `data-frwd-id="${FIRST}"`));
    const result = apply(document, envelope([{ op: "delete_node", target: FIRST }]));
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("ambiguous-target");
  });

  it("refuses to delete the document root", () => {
    const document = load();
    const result = apply(
      FrwdDocument.parse(document.toHtml().replace("<main data-frwd-document", `<main data-frwd-id="root" data-frwd-document`)),
      envelope([{ op: "delete_node", target: "root" }]),
    );
    expect(result.errors[0]?.code).toBe("undeletable-target");
  });
});

describe("preview never mutates", () => {
  it("leaves the document byte-identical", () => {
    const document = load();
    const before = document.toHtml();

    const result = preview(document, envelope([{ op: "replace_text", target: FIRST, text: "Changed." }]), { now: AT });

    expect(result.ok).toBe(true);
    expect(document.toHtml()).toBe(before);
    expect(result.staged?.toHtml()).not.toBe(before);
    expect(result.staged?.toHtml()).toContain("Changed.");
  });

  it("does not bump the live revision", () => {
    const document = load(3);
    preview(document, envelope([{ op: "delete_node", target: SECOND }], { baseRevision: 3 }), { now: AT });
    expect(currentRevision(document)).toBe(3);
  });
});

describe("atomicity", () => {
  it("changes absolutely nothing when a later operation fails", () => {
    const document = load();
    const before = document.toHtml();

    const result = apply(
      document,
      envelope([
        { op: "replace_text", target: FIRST, text: "Changed." },
        { op: "delete_node", target: "does-not-exist" },
      ]),
      { now: AT },
    );

    expect(result.ok).toBe(false);
    expect(document.toHtml()).toBe(before);
    expect(currentRevision(document)).toBe(0);
  });

  it("shows the would-be result alongside the reasons it was refused", () => {
    const document = load();
    const result = apply(
      document,
      envelope([
        { op: "replace_text", target: FIRST, text: "Changed." },
        { op: "insert_after", target: SECOND, html: `<p data-frwd-id="x">Fine.</p><script>alert(1)</script>` },
      ]),
      { now: AT },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("executable-script");
    expect(result.staged?.toHtml()).toContain("Changed.");
    expect(document.toHtml()).not.toContain("Changed.");
  });
});

describe("revision and timestamps", () => {
  it("increments revision exactly once and updates modified exactly once", () => {
    const document = load(4);
    const result = apply(
      document,
      envelope(
        [
          { op: "replace_text", target: FIRST, text: "A." },
          { op: "replace_text", target: SECOND, text: "B." },
        ],
        { baseRevision: 4 },
      ),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(result.revision).toBe(5);
    expect(currentRevision(document)).toBe(5);
    expect(document.manifest?.modified).toBe("2026-08-09T12:00:00Z");
    expect(document.manifest?.created).toBe("2026-08-09T09:00:00Z");
  });

  it("starts an unversioned document at revision 1", () => {
    const document = load();
    expect(apply(document, envelope([{ op: "delete_node", target: SECOND }]), { now: AT }).revision).toBe(1);
  });

  it("rejects a manifest whose revision is not a non-negative integer", () => {
    const document = FrwdDocument.parse(source().replace('"title": "Operations"', '"revision": "seven", "title": "Operations"'));
    expect(apply(document, envelope([{ op: "delete_node", target: SECOND }])).errors[0]?.code).toBe("invalid-revision");
  });
});

describe("replace_text", () => {
  it("replaces the whole content with one plain-text node", () => {
    const document = load();
    apply(document, envelope([{ op: "replace_text", target: FIRST, text: "Just text." }]), { now: AT });

    const html = document.toHtml();
    expect(html).toContain(`<p data-frwd-id="${FIRST}">Just text.</p>`);
    // Deliberately blunt in v0.1: inline markup inside the target is gone.
    expect(html).not.toContain("<strong>emphasis</strong>");
  });

  it("inserts text as text, never as markup", () => {
    const document = load();
    apply(document, envelope([{ op: "replace_text", target: FIRST, text: '<b>not bold</b> & "quoted"' }]), { now: AT });

    const html = document.toHtml();
    expect(html).toContain("&lt;b&gt;not bold&lt;/b&gt; &amp; \"quoted\"");
    expect(html).not.toContain("<b>not bold</b>");
  });

  it("reports identified blocks it destroyed", () => {
    const document = load();
    const result = apply(document, envelope([{ op: "replace_text", target: LIST, text: "Flattened." }]), { now: AT });

    expect(result.ok).toBe(true);
    expect(result.changes[0]?.removedIds).toEqual([ITEM]);
  });
});

describe("structural operations", () => {
  it("inserts before and after a target", () => {
    const document = load();
    apply(
      document,
      envelope([
        { op: "insert_before", target: SECOND, html: `<p data-frwd-id="before">Before.</p>` },
        { op: "insert_after", target: SECOND, html: `<p data-frwd-id="after">After.</p>` },
      ]),
      { now: AT },
    );

    const html = document.toHtml();
    expect(html.indexOf("Before.")).toBeLessThan(html.indexOf("Second paragraph."));
    expect(html.indexOf("After.")).toBeGreaterThan(html.indexOf("Second paragraph."));
  });

  it("parses a fragment in the context it will live in", () => {
    // `<li>` outside a list is discarded by the HTML fragment parsing
    // algorithm, so the context element is not an optimisation.
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "append_child", target: LIST, html: `<li data-frwd-id="item-2">Two items.</li>` }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(document.toHtml()).toContain(`<li data-frwd-id="item-2">Two items.</li>`);
  });

  it("replaces a node and reports the identity that went with it", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "replace_node", target: LIST, html: `<blockquote data-frwd-id="quote"><p data-frwd-id="quoted">Quoted.</p></blockquote>` }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(result.changes[0]?.removedIds).toEqual([ITEM, LIST]);
    expect(document.getElementById(LIST)).toBeUndefined();
    expect(document.getElementById("quote")).toBeDefined();
  });

  it("moves a node without changing its identity", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "move_node", target: LIST, destination: HEADING, position: "after" }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    const html = document.toHtml();
    expect(html.indexOf("One item.")).toBeLessThan(html.indexOf("First paragraph"));
    expect(document.getElementById(ITEM)).toBeDefined();
  });

  it("refuses to move a node inside itself", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "move_node", target: LIST, destination: ITEM, position: "append" }]),
      { now: AT },
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("invalid-move");
  });

  it("rejects markup that parses to nothing", () => {
    const document = load();
    expect(apply(document, envelope([{ op: "insert_after", target: SECOND, html: "   " }])).errors[0]?.code).toBe(
      "empty-fragment",
    );
  });
});

describe("stable identity of inserted nodes", () => {
  it("mints ids for inserted blocks that arrive without one", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "insert_after", target: SECOND, html: `<p>No id supplied.</p>` }]),
      { now: AT, idFactory: ids() },
    );

    expect(result.ok).toBe(true);
    expect(result.changes[0]?.assignedIds).toEqual(["new-1"]);
    expect(document.getElementById("new-1")).toBeDefined();
  });

  it("refuses to commit a duplicate identifier", () => {
    const document = load();
    const before = document.toHtml();
    const result = apply(
      document,
      envelope([{ op: "insert_after", target: SECOND, html: `<p data-frwd-id="${FIRST}">Clashing.</p>` }]),
      { now: AT },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("duplicate-stable-id");
    expect(document.toHtml()).toBe(before);
  });

  it("refuses to rewrite a stable identifier through set_attribute", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_attribute", target: FIRST, name: "data-frwd-id", value: "something-else" }]),
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("immutable-attribute");
  });
});

describe("set_attribute", () => {
  it("sets and removes an attribute", () => {
    const document = load();
    apply(document, envelope([{ op: "set_attribute", target: FIRST, name: "lang", value: "fr" }]), { now: AT });
    expect(document.toHtml()).toContain('lang="fr"');

    apply(document, envelope([{ op: "set_attribute", target: FIRST, name: "lang" }], { baseRevision: 1 }), { now: AT });
    expect(document.toHtml()).not.toContain('lang="fr"');
  });

  it("rejects an unsafe attribute rather than quietly dropping it", () => {
    const document = load();
    const before = document.toHtml();
    const result = apply(
      document,
      envelope([{ op: "set_attribute", target: FIRST, name: "onclick", value: "alert(1)" }]),
      { now: AT },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("event-handler-attribute");
    expect(document.toHtml()).toBe(before);
  });
});

describe("constraints", () => {
  it("contentLocked permits only presentational attribute changes", () => {
    const document = load();

    expect(
      apply(document, envelope([{ op: "replace_text", target: FIRST, text: "No." }], { constraints: { contentLocked: true } }))
        .errors[0]?.code,
    ).toBe("content-locked");

    const styled = apply(
      document,
      envelope([{ op: "set_attribute", target: FIRST, name: "class", value: "lead" }], {
        constraints: { contentLocked: true },
      }),
      { now: AT },
    );
    expect(styled.ok).toBe(true);
  });

  it("styleLocked rejects presentational changes and permits content", () => {
    const document = load();

    expect(
      apply(
        document,
        envelope([{ op: "set_attribute", target: FIRST, name: "style", value: "color: red" }], {
          constraints: { styleLocked: true },
        }),
      ).errors[0]?.code,
    ).toBe("style-locked");

    const edited = apply(
      document,
      envelope([{ op: "replace_text", target: FIRST, text: "Allowed." }], { constraints: { styleLocked: true } }),
      { now: AT },
    );
    expect(edited.ok).toBe(true);
  });
});

describe("the committed document", () => {
  it("stays conforming on both layers and round-trips", () => {
    const document = load();
    const result = apply(
      document,
      envelope([
        { op: "insert_after", target: SECOND, html: `<p>Fresh.</p>` },
        { op: "move_node", target: LIST, destination: HEADING, position: "after" },
        { op: "set_attribute", target: FIRST, name: "class", value: "lead" },
      ]),
      { now: AT, idFactory: ids() },
    );

    expect(result.ok).toBe(true);
    expect(result.changes).toHaveLength(3);

    const reopened = FrwdDocument.parse(document.toHtml());
    expect(reopened.isConforming).toBe(true);
    expect(reopened.toHtml()).toBe(document.toHtml());
  });
});
