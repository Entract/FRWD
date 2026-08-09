import { FrwdDocument, getAttr, serializeElement } from "@frwd/format";
import { apply, readStyleProperties, type Operation, type OperationEnvelope } from "@frwd/operations";
import { describe, expect, it } from "vitest";

const DOCUMENT_ID = "8c1d2e33-7a44-4b55-9c66-0d7e8f901234";
const AT = new Date("2026-08-10T09:00:00Z");

function load(styleAttribute = ""): FrwdDocument {
  const style = styleAttribute === "" ? "" : ` style="${styleAttribute}"`;
  return FrwdDocument.parse(`<!DOCTYPE html><html data-frwd-version="0.1" lang="en">
<head>
<meta charset="utf-8">
<title>Style</title>
<script id="frwd-manifest" type="application/frwd+json">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Style",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
<style id="frwd-document-style">.card { padding: 4mm; }</style>
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="a1" class="card"${style}><p data-frwd-id="p1">Text.</p></article>
</main>
</body>
</html>`);
}

function envelope(operations: Operation[], overrides: Partial<OperationEnvelope> = {}): OperationEnvelope {
  return { protocol: "frwd-ops", version: "0.1", documentId: DOCUMENT_ID, baseRevision: 0, operations, ...overrides };
}

const styleOf = (document: FrwdDocument, id: string): string =>
  getAttr(document.getElementById(id)!, "style") ?? "";

describe("set_style_property", () => {
  it("adds a declaration to an element that had none", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm" }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(readStyleProperties(styleOf(document, "a1"))).toEqual({ padding: "6mm" });
  });

  it("preserves every unrelated declaration, in order", () => {
    const document = load("color: red; padding: 2mm; border-radius: 3px");
    apply(document, envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm" }]), {
      now: AT,
    });

    expect(readStyleProperties(styleOf(document, "a1"))).toEqual({
      color: "red",
      padding: "6mm",
      "border-radius": "3px",
    });
    expect(styleOf(document, "a1").indexOf("color")).toBeLessThan(styleOf(document, "a1").indexOf("padding"));
  });

  it("keeps the element's identity and other attributes", () => {
    const document = load();
    apply(document, envelope([{ op: "set_style_property", target: "a1", property: "gap", value: "1rem" }]), {
      now: AT,
    });

    const element = document.getElementById("a1")!;
    expect(getAttr(element, "data-frwd-id")).toBe("a1");
    expect(getAttr(element, "class")).toBe("card");
    expect(element.childNodes.length).toBeGreaterThan(0);
  });

  it("names the target, property and value in the change record", () => {
    const document = load("padding: 2mm");
    const result = apply(
      document,
      envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm" }]),
      { now: AT },
    );

    expect(result.changes[0]).toEqual({
      op: "set_style_property",
      target: "a1",
      summary: "Set padding to 6mm on <article> (was 2mm).",
    });
  });

  it("refuses a value that would restructure the declaration block", () => {
    const document = load("color: red");
    const result = apply(
      document,
      envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm; display: none" }]),
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("invalid-style-value");
    expect(styleOf(document, "a1")).toBe("color: red");
  });

  it("refuses a property name that is not one", () => {
    const result = apply(
      load(),
      envelope([{ op: "set_style_property", target: "a1", property: "padding: red;", value: "1px" }]),
    );
    expect(result.errors[0]?.code).toBe("invalid-style-property");
  });

  it("refuses a value the CSS safety profile forbids", () => {
    // The staged document still has to clear the profile, so a declaration
    // cannot smuggle a remote reference into a document.
    const document = load();
    const result = apply(
      document,
      envelope([
        { op: "set_style_property", target: "a1", property: "background-image", value: "url(https://example.invalid/x.png)" },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("css-external-resource");
    expect(styleOf(document, "a1")).toBe("");
  });

  it("is rejected by styleLocked and permitted by contentLocked", () => {
    expect(
      apply(
        load(),
        envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm" }], {
          constraints: { styleLocked: true },
        }),
      ).errors[0]?.code,
    ).toBe("style-locked");

    const document = load();
    expect(
      apply(
        document,
        envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm" }], {
          constraints: { contentLocked: true },
        }),
        { now: AT },
      ).ok,
    ).toBe(true);
  });
});

describe("remove_style_property", () => {
  it("removes one declaration and leaves the others", () => {
    const document = load("color: red; padding: 6mm");
    apply(document, envelope([{ op: "remove_style_property", target: "a1", property: "padding" }]), { now: AT });

    expect(readStyleProperties(styleOf(document, "a1"))).toEqual({ color: "red" });
  });

  it("removes the attribute entirely when the last declaration goes", () => {
    // A document that has had an override applied and cleared should be
    // indistinguishable from one that never had it - not left with style="".
    const clean = load();
    const document = load();

    apply(document, envelope([{ op: "set_style_property", target: "a1", property: "padding", value: "6mm" }]), {
      now: AT,
    });
    apply(document, envelope([{ op: "remove_style_property", target: "a1", property: "padding" }], { baseRevision: 1 }), {
      now: AT,
    });

    expect(getAttr(document.getElementById("a1")!, "style")).toBeUndefined();

    // The element itself is byte-identical to one that was never touched. The
    // manifest legitimately differs - two transactions happened - so comparing
    // whole files would be asserting the wrong thing.
    expect(serializeElement(document.getElementById("a1")!)).toBe(serializeElement(clean.getElementById("a1")!));
  });

  it("says what it removed", () => {
    const document = load("padding: 6mm");
    const result = apply(document, envelope([{ op: "remove_style_property", target: "a1", property: "padding" }]), {
      now: AT,
    });

    expect(result.changes[0]?.summary).toContain("Removed the local padding override");
    expect(result.changes[0]?.summary).toContain("was 6mm");
  });

  it("is harmless when there was no override", () => {
    const document = load("color: red");
    const result = apply(document, envelope([{ op: "remove_style_property", target: "a1", property: "padding" }]), {
      now: AT,
    });

    expect(result.ok).toBe(true);
    expect(styleOf(document, "a1")).toBe("color: red");
  });
});

describe("style edits are ordinary transactions", () => {
  it("are atomic alongside other operations", () => {
    const document = load();
    const before = document.toHtml();

    const result = apply(
      document,
      envelope([
        { op: "set_style_property", target: "a1", property: "padding", value: "6mm" },
        { op: "set_style_property", target: "does-not-exist", property: "gap", value: "1rem" },
      ]),
    );

    expect(result.ok).toBe(false);
    expect(document.toHtml()).toBe(before);
  });

  it("leave the document conforming and round-tripping", () => {
    const document = load();
    apply(
      document,
      envelope([
        { op: "set_style_property", target: "a1", property: "padding", value: "6mm" },
        { op: "set_style_property", target: "a1", property: "background-color", value: "#eef" },
      ]),
      { now: AT },
    );

    const reopened = FrwdDocument.parse(document.toHtml());
    expect(reopened.isConforming).toBe(true);
    expect(reopened.toHtml()).toBe(document.toHtml());
  });
});
