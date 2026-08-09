# Fixtures

Reference FRWD documents. These are **proof, not just test data**.

Proving that FRWD can produce exceptionally good-looking documents — on screen
and in print — is central to the project, so the designed fixtures are a
first-class part of development. They also drive requirements back into
`format`, `sanitize` and `publisher`, and every one runs through the conformance
harness and, later, the cross-browser suite.

## Adding one

Two files, no wiring — the suites discover them:

```text
fixtures/<group>/<name>.frwd    the document
fixtures/<group>/<name>.json    what it proves
```

The sidecar is required. A fixture without stated expectations tests nothing in
particular and would quietly pass whatever the implementation happened to do.

```json
{
  "title": "Minimal FRWD",
  "description": "Why this document exists and what it isolates.",
  "conforming": true,
  "canonical": true,
  "expectedDiagnostics": [],
  "profileConforming": true,
  "expectedProfileDiagnostics": []
}
```

`expectedDiagnostics` (structural, from `@frwd/format`) and
`expectedProfileDiagnostics` (native safety profile, from `@frwd/sanitize`) are
each the **exact** set of distinct codes the document should produce, so a
fixture isolates one defect rather than accumulating noise.

The two profile fields default to "clean", which means every fixture is held to
the safety profile unless it exists to violate it — a stray remote URL in a
designed reference document fails the suite rather than shipping.

A fixture may also set `inspectOptions`, so it can exercise a configurable limit
without shipping a file large enough to trip the default one.

## Canonical form

Fixtures with `"canonical": true` are stored exactly as `@frwd/format` would
write them, which lets the harness assert a no-op open/save produces no diff
against a real file rather than a string in a test.

After hand-editing a fixture:

```bash
pnpm fixtures:canonicalize
```

Note that a canonical `.frwd` file ends at `</html>` with no trailing newline.
Text after `</html>` is not outside the document — the HTML5 parser moves it
into `<body>` — so a cosmetic newline would become document content.

This is **reference canonical serialization**, not a conformance rule: it
constrains our fixtures and our writer, not FRWD documents in general. A
document produced elsewhere with different attribute order or indentation is
just as conforming, and would carry `"canonical": false`. See spec §21.

## The corpus

| Fixture | Purpose |
|---|---|
| `minimal/` | Smallest document exercising every structural rule. |
| `invalid/` | One structural defect each: missing doctype, missing version, unsupported major version, missing document root, malformed manifest, duplicate node id, missing stable id. |
| `security/` | Structurally valid documents that break the native safety profile: inline and remote script, event handlers, `javascript:` URLs plain and obfuscated, SVG script, meta refresh, iframe, `base`, HTML data URLs, remote and relative images, `@import`, remote fonts and background images, and an oversized embedded asset. |
| `cv/` | Planned — dense typographic layout, print fidelity. |
| `scientific/` | Planned — equations, figures, tables, cross-references. |
| `business-report/` | Planned — charts, data, callouts, cover design. |
| `rich-manual/` | Planned — video, audio, galleries, interactive disclosure. |

`minimal/` and `invalid/` landed with task `t-003`, `security/` with `t-004`. The
designed set arrives with `t-008`.
