import { FrwdDocument } from "@frwd/format";
import { apply, commitPrepared, currentRevision, preview, type Operation, type OperationEnvelope } from "@frwd/operations";
import { describe, expect, it } from "vitest";

const DOCUMENT_ID = "f1000000-0000-4000-8000-000000000001";
const FIRST = "f1000000-0000-4000-8000-000000000004";
const SECOND = "f1000000-0000-4000-8000-000000000005";

function source(revision?: number, documentId = DOCUMENT_ID): string {
  const revisionLine = revision === undefined ? "" : `,\n  "revision": ${revision}`;
  return `<!DOCTYPE html><html data-frwd-version="0.1" lang="en">
<head>
<meta charset="utf-8">
<title>Prepared</title>
<script id="frwd-manifest" type="application/frwd+json">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${documentId}",
  "title": "Prepared",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"${revisionLine}
}
</script>
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="f1000000-0000-4000-8000-000000000002">
<h1 data-frwd-id="f1000000-0000-4000-8000-000000000003">Prepared</h1>
<p data-frwd-id="${FIRST}">First paragraph.</p>
<p data-frwd-id="${SECOND}">Second paragraph.</p>
</article>
</main>
</body>
</html>`;
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

describe("the reviewed result is the committed result", () => {
  it("commits the exact identifier shown in preview, with no idFactory in sight", () => {
    // The regression this whole path exists for. Rerunning the transaction at
    // commit time would mint a different UUID, so the document that landed
    // would not be the document anyone reviewed.
    const document = FrwdDocument.parse(source());

    const prepared = preview(document, envelope([{ op: "insert_after", target: SECOND, html: "<p>No id supplied.</p>" }]));

    expect(prepared.ok).toBe(true);
    const [previewedId] = prepared.changes[0]?.assignedIds ?? [];
    expect(previewedId).toMatch(/^[0-9a-f-]{36}$/);
    expect(prepared.staged?.getElementById(previewedId!)).toBeDefined();

    expect(commitPrepared(document, prepared).ok).toBe(true);

    expect(document.getElementById(previewedId!)).toBeDefined();
    expect(document.toHtml()).toBe(prepared.staged?.toHtml());
  });

  it("commits the exact modified timestamp shown in preview", () => {
    const document = FrwdDocument.parse(source());
    const prepared = preview(document, envelope([{ op: "replace_text", target: FIRST, text: "Changed." }]));

    const previewedModified = prepared.staged?.manifest?.modified;
    expect(previewedModified).toBeDefined();

    commitPrepared(document, prepared);
    expect(document.manifest?.modified).toBe(previewedModified);
  });

  it("shows the final revision in the preview rather than after the fact", () => {
    const document = FrwdDocument.parse(source(4));
    const prepared = preview(document, envelope([{ op: "delete_node", target: SECOND }], { baseRevision: 4 }));

    expect(prepared.revision).toBe(5);
    expect(prepared.staged?.manifest?.["revision"]).toBe(5);
    expect(currentRevision(document)).toBe(4);

    expect(commitPrepared(document, prepared).revision).toBe(5);
    expect(currentRevision(document)).toBe(5);
  });

  it("does not rerun the operations at commit time", () => {
    // Two identical previews mint different ids; committing one must not
    // produce the other.
    const document = FrwdDocument.parse(source());
    const first = preview(document, envelope([{ op: "insert_after", target: SECOND, html: "<p>One.</p>" }]));
    const second = preview(document, envelope([{ op: "insert_after", target: SECOND, html: "<p>One.</p>" }]));

    const firstId = first.changes[0]?.assignedIds?.[0];
    const secondId = second.changes[0]?.assignedIds?.[0];
    expect(firstId).not.toBe(secondId);

    commitPrepared(document, first);
    expect(document.getElementById(firstId!)).toBeDefined();
    expect(document.getElementById(secondId!)).toBeUndefined();
  });
});

describe("commit refuses a document that moved on", () => {
  it("refuses when the revision advanced after preview", () => {
    const document = FrwdDocument.parse(source());
    const prepared = preview(document, envelope([{ op: "replace_text", target: FIRST, text: "A." }]));

    // Someone else commits first.
    apply(document, envelope([{ op: "replace_text", target: SECOND, text: "B." }]));

    const committed = commitPrepared(document, prepared);
    expect(committed.ok).toBe(false);
    expect(committed.errors[0]?.code).toBe("stale-revision");
    expect(document.toHtml()).toContain("B.");
    expect(document.toHtml()).not.toContain("A.");
  });

  it("refuses when the content changed at the same revision", () => {
    // The revision check alone would miss this: an editor writing directly to
    // the tree does not bump anything.
    const document = FrwdDocument.parse(source());
    const prepared = preview(document, envelope([{ op: "replace_text", target: FIRST, text: "A." }]));

    const paragraph = document.getElementById(SECOND);
    paragraph!.attrs.push({ name: "class", value: "touched" });

    const committed = commitPrepared(document, prepared);
    expect(committed.ok).toBe(false);
    expect(committed.errors[0]?.code).toBe("document-changed");
    expect(document.toHtml()).not.toContain("A.");
  });

  it("refuses a different document", () => {
    const document = FrwdDocument.parse(source());
    const prepared = preview(document, envelope([{ op: "replace_text", target: FIRST, text: "A." }]));

    const other = FrwdDocument.parse(source(undefined, "f1000000-0000-4000-8000-0000000000ff"));
    const committed = commitPrepared(other, prepared);

    expect(committed.ok).toBe(false);
    expect(committed.errors[0]?.code).toBe("document-id-mismatch");
  });

  it("refuses a transaction that was rejected during preparation", () => {
    const document = FrwdDocument.parse(source());
    const prepared = preview(document, envelope([{ op: "delete_node", target: "nope" }]));

    expect(prepared.ok).toBe(false);
    const committed = commitPrepared(document, prepared);
    expect(committed.ok).toBe(false);
    expect(committed.errors[0]?.code).toBe("not-committable");
  });

  it("leaves the document untouched on every refusal", () => {
    const document = FrwdDocument.parse(source());
    const before = document.toHtml();
    const prepared = preview(document, envelope([{ op: "delete_node", target: "nope" }]));

    commitPrepared(document, prepared);
    expect(document.toHtml()).toBe(before);
  });
});

describe("apply is prepare plus commit", () => {
  it("returns the prepared result it committed", () => {
    const document = FrwdDocument.parse(source());
    const result = apply(document, envelope([{ op: "insert_after", target: SECOND, html: "<p>Fresh.</p>" }]));

    expect(result.ok).toBe(true);
    const assigned = result.changes[0]?.assignedIds?.[0];
    expect(document.getElementById(assigned!)).toBeDefined();
    expect(document.toHtml()).toBe(result.staged?.toHtml());
  });
});
