import { FrwdDocument } from "@frwd/format";
import { apply, preview, readThemeToken, type OperationEnvelope, type Operation } from "@frwd/operations";
import { describe, expect, it } from "vitest";

const DOCUMENT_ID = "7a5b0e11-9c42-4d7e-8f60-3b2c1d4e5f60";
const AT = new Date("2026-08-09T12:00:00Z");

const THEME = `:root {
  --ink: #14171c;
  --accent: #2a4a7f;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e7e9ed;
    --accent: #8fb4f0;
  }
}

body { color: var(--ink); }`;

function load(css = THEME): FrwdDocument {
  return FrwdDocument.parse(`<!DOCTYPE html><html data-frwd-version="0.1" lang="en">
<head>
<meta charset="utf-8">
<title>Theme</title>
<script id="frwd-manifest" type="application/frwd+json">
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "${DOCUMENT_ID}",
  "title": "Theme",
  "created": "2026-08-09T09:00:00Z",
  "modified": "2026-08-09T09:00:00Z"
}
</script>
<style id="frwd-document-style">${css}</style>
</head>
<body>
<main data-frwd-document>
<article data-frwd-id="a1"><p data-frwd-id="p1">Text.</p></article>
</main>
</body>
</html>`);
}

function envelope(operations: Operation[], overrides: Partial<OperationEnvelope> = {}): OperationEnvelope {
  return { protocol: "frwd-ops", version: "0.1", documentId: DOCUMENT_ID, baseRevision: 0, operations, ...overrides };
}

describe("set_theme_token", () => {
  it("changes the light value without touching the dark one", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--accent", value: "#2458a6", scope: "default" }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(readThemeToken(document.css!, "--accent", "default")).toBe("#2458a6");
    expect(readThemeToken(document.css!, "--accent", "dark")).toBe("#8fb4f0");
  });

  it("changes the dark value without touching the light one", () => {
    const document = load();
    apply(document, envelope([{ op: "set_theme_token", name: "--accent", value: "#a8d5ff", scope: "dark" }]), {
      now: AT,
    });

    expect(readThemeToken(document.css!, "--accent", "dark")).toBe("#a8d5ff");
    expect(readThemeToken(document.css!, "--accent", "default")).toBe("#2a4a7f");
  });

  it("defaults to the light scope when none is given", () => {
    const document = load();
    apply(document, envelope([{ op: "set_theme_token", name: "--ink", value: "#000000" }]), { now: AT });

    expect(readThemeToken(document.css!, "--ink", "default")).toBe("#000000");
    expect(readThemeToken(document.css!, "--ink", "dark")).toBe("#e7e9ed");
  });

  it("edits structurally, leaving the rest of the stylesheet alone", () => {
    const document = load();
    apply(document, envelope([{ op: "set_theme_token", name: "--accent", value: "#2458a6" }]), { now: AT });

    const css = document.css!;
    expect(css).toContain("body { color: var(--ink); }");
    expect(css).toContain("--ink: #14171c");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });

  it("adds a token the document did not have", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--measure", value: "40rem" }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(readThemeToken(document.css!, "--measure", "default")).toBe("40rem");
    expect(result.changes[0]?.summary).toContain("added it to the existing rule");
  });

  it("creates a dark rule when the document has no dark theme yet", () => {
    const document = load(":root { --accent: #2a4a7f; }");
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--accent", value: "#8fb4f0", scope: "dark" }]),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(document.css).toContain("prefers-color-scheme: dark");
    expect(readThemeToken(document.css!, "--accent", "dark")).toBe("#8fb4f0");
    expect(result.changes[0]?.summary).toContain("added a dark :root rule");
  });

  it("appears in the change record with the token as its target", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--accent", value: "#2458a6", scope: "dark" }]),
      { now: AT },
    );

    expect(result.changes).toEqual([
      {
        op: "set_theme_token",
        target: "--accent",
        summary: "Set --accent to #2458a6 in the dark theme; replaced the previous value.",
      },
    ]);
  });
});

describe("it refuses rather than guessing", () => {
  it("refuses when two rules in the scope declare the token", () => {
    const document = load(":root { --accent: red; }\n:root { --accent: blue; }");
    const result = apply(document, envelope([{ op: "set_theme_token", name: "--accent", value: "green" }]));

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("ambiguous-theme-scope");
    expect(document.css).toContain("--accent: red");
  });

  it("refuses when the scope has several rules and none declares the token", () => {
    const document = load(":root { --ink: black; }\n:root { --paper: white; }");
    const result = apply(document, envelope([{ op: "set_theme_token", name: "--accent", value: "green" }]));

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("ambiguous-theme-scope");
  });

  it("refuses a name that is not a custom property", () => {
    const result = apply(load(), envelope([{ op: "set_theme_token", name: "color", value: "red" }]));
    expect(result.errors[0]?.code).toBe("invalid-theme-value");
  });

  it("refuses a value that would restructure the stylesheet", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--accent", value: "red; } body { display: none" }]),
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("invalid-theme-value");
    expect(document.css).not.toContain("display: none");
  });

  it("refuses when the document has no stylesheet to edit", () => {
    const document = FrwdDocument.parse(load().toHtml().replace(/<style id="frwd-document-style">[\s\S]*?<\/style>/, ""));
    const result = apply(document, envelope([{ op: "set_theme_token", name: "--accent", value: "red" }]));

    expect(result.errors[0]?.code).toBe("missing-document-stylesheet");
  });

  it("refuses a value the CSS safety profile forbids", () => {
    // The staged document still has to clear the profile, so a token cannot be
    // used to smuggle a remote reference into the stylesheet.
    const document = load();
    const before = document.css;
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--accent", value: "url(https://example.invalid/x.png)" }]),
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("css-external-resource");
    expect(document.css).toBe(before);
  });
});

describe("locks", () => {
  it("is rejected by styleLocked", () => {
    const result = apply(
      load(),
      envelope([{ op: "set_theme_token", name: "--accent", value: "red" }], { constraints: { styleLocked: true } }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("style-locked");
  });

  it("is permitted by contentLocked, because it changes no content", () => {
    const document = load();
    const result = apply(
      document,
      envelope([{ op: "set_theme_token", name: "--accent", value: "#2458a6" }], {
        constraints: { contentLocked: true },
      }),
      { now: AT },
    );

    expect(result.ok).toBe(true);
    expect(readThemeToken(document.css!, "--accent", "default")).toBe("#2458a6");
  });
});

describe("it is an ordinary transaction", () => {
  it("previews without touching the document", () => {
    const document = load();
    const before = document.toHtml();

    const prepared = preview(document, envelope([{ op: "set_theme_token", name: "--accent", value: "#2458a6" }]), {
      now: AT,
    });

    expect(prepared.ok).toBe(true);
    expect(document.toHtml()).toBe(before);
    expect(readThemeToken(prepared.staged!.css!, "--accent", "default")).toBe("#2458a6");
  });

  it("is atomic alongside content operations", () => {
    const document = load();
    const before = document.toHtml();

    const result = apply(
      document,
      envelope([
        { op: "set_theme_token", name: "--accent", value: "#2458a6" },
        { op: "replace_text", target: "does-not-exist", text: "x" },
      ]),
      { now: AT },
    );

    expect(result.ok).toBe(false);
    expect(document.toHtml()).toBe(before);
  });

  it("bumps the revision exactly once", () => {
    const document = load();
    const result = apply(
      document,
      envelope([
        { op: "set_theme_token", name: "--accent", value: "#2458a6", scope: "default" },
        { op: "set_theme_token", name: "--accent", value: "#a8d5ff", scope: "dark" },
      ]),
      { now: AT },
    );

    expect(result.revision).toBe(1);
    expect(document.manifest?.["revision"]).toBe(1);
    expect(result.changes).toHaveLength(2);
  });

  it("leaves the document conforming", () => {
    const document = load();
    apply(document, envelope([{ op: "set_theme_token", name: "--accent", value: "#2458a6" }]), { now: AT });

    const reopened = FrwdDocument.parse(document.toHtml());
    expect(reopened.isConforming).toBe(true);
    expect(reopened.toHtml()).toBe(document.toHtml());
  });
});
