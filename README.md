# FRWD

**Flowing Rich Web Document.** Pronounced *"forward"*.

> Word-like editing and reflow, web-quality design, native rich media, and reliable AI editing — in a durable file you own.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Spec](https://img.shields.io/badge/spec-0.1%20draft-orange.svg)](plan/docs/02_FRWD_FORMAT_SPEC_V0_1.md)

FRWD is a general-purpose document format for reports, proposals, papers, manuals, portfolios, technical documentation and anything else that wants to read like a document and look like the web.

## Why it exists

Documents are stuck between two formats that each solve half the problem.

DOCX edits like a document but its visual ceiling is low, and generated output tends to be fragile. HTML has extraordinary typography, layout, responsiveness and media — and generates beautifully from AI — but an HTML file is not something an ordinary person experiences as an editable document.

FRWD closes that gap: the presentation quality of the web, with the editing behaviour of a word processor, in a file that belongs to whoever holds it.

## The five properties

- **F — Flowing.** Insert a paragraph and later content moves. Sections, lists, figures and tables participate in flow; pagination is derived from it rather than replacing it.
- **R — Rich.** Images, video, audio, equations, charts, galleries, data and callouts are first-class content, not attachments.
- **W — Web.** HTML and CSS are the rendering foundation, so you inherit real typography, responsive layout, print styles, accessibility primitives and a representation coding models already understand.
- **D — Document.** A durable artifact you can open, edit, save, email, archive and print. It works offline and needs no account.
- **AI-native.** Every structural object has a stable identity, so AI edits address semantic objects through explicit operations instead of inferring the document from pixels or rewriting the whole file.

## The core architectural idea

FRWD 0.1 uses **one HTML document as the native source** — not a ZIP container, not an application-specific JSON tree.

```text
report.frwd        native document
                   semantic HTML + metadata + CSS/theme + embedded media
                   + stable FRWD identifiers + declarative rich components
                   no arbitrary executable JavaScript

report.frwd.html   browser publication
                   the same document plus the trusted standard FRWD runtime
                   (edit mode, safe rich interactivity, Save As, print helpers)
                   ordinary HTML — opens in any modern browser, offline
```

Because the file is semantic HTML, it stays intelligible to generic tooling, diffs cleanly in version control, and remains readable long after any particular editor has gone.

Twelve invariants govern the design — among them: semantic HTML is the canonical document, flow is the default layout model, the native profile carries no arbitrary script, a publication stays useful with JavaScript disabled, print is an output view rather than the source, and the format depends on no single AI vendor, editor library or cloud service. See [`00_START_HERE.md`](plan/docs/00_START_HERE.md); breaking one requires an ADR.

## Why open

The format is open. The reference implementation is open. Your documents belong to you, and no company is required to keep them readable.

Everything here — specification and reference implementation — is Apache-2.0, patent grant included, because FRWD aims to be a format rather than an app. The name and logo are held back separately so that "FRWD compatible" keeps meaning something: see [`TRADEMARKS.md`](TRADEMARKS.md).

## Status

Early. The specification is at draft 0.1 and the format will change before it is frozen.

| Component | State |
|---|---|
| `packages/format` | Parse, serialize, stable identity, validation |
| `packages/sanitize` | Native safety profile: inspection, repair, composed conformance |
| `packages/operations` | Atomic transactions of deterministic semantic edit operations |
| `packages/publisher` + `runtime` | `.frwd.html` emission, trusted runtime, publication validation |
| `apps/editor` | Not started — deliberately last |

## Explore

```bash
corepack enable
pnpm install

pnpm typecheck
pnpm test           # unit and conformance suites
pnpm test:browser   # Chromium, Firefox and WebKit
```

Requires Node 24 LTS.

Start reading at [`plan/docs/00_START_HERE.md`](plan/docs/00_START_HERE.md), which defines the invariants and the precedence order when documents disagree. The draft format specification is [`plan/docs/02_FRWD_FORMAT_SPEC_V0_1.md`](plan/docs/02_FRWD_FORMAT_SPEC_V0_1.md), and [`docs/`](docs/) maps the rest.

## The first proof

Not a toolbar. This:

```text
AI creates a beautiful FRWD report
  → user opens it in the FRWD editor
  → clicks ordinary text and edits naturally
  → adds a paragraph, document reflows correctly
  → moves a video block
  → asks AI to restyle without changing content
  → exports report.frwd.html
  → recipient opens it offline in a browser
  → recipient can read, play media, optionally edit, and Save As
  → print/PDF still looks excellent
```

If that works, the core idea works.

## Contributing

There is not yet enough implementation to contribute to meaningfully; a `CONTRIBUTING.md` will arrive once the format package and conformance fixtures are settled. Issues and design discussion are welcome now.

## License

[Apache License 2.0](LICENSE), copyright 2026 Guy Monroe Entract. See [`NOTICE`](NOTICE) for attribution and [`TRADEMARKS.md`](TRADEMARKS.md) for the name and logo policy.
