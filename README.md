# FRWD

**Flowing Rich Web Document.** Pronounced *"forward"*.

> Word-like editing and reflow, web-quality design, native rich media, and reliable AI editing — in a durable file you own.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/spec-0.1%20draft-orange.svg)](plan/docs/02_FRWD_FORMAT_SPEC_V0_1.md)

---

## Status

**Pre-implementation.** The design pack is complete and the specification is at draft 0.1. Implementation is starting now, in public, so the record of when decisions were made is part of the project.

Nothing here is stable yet. The format will change before 0.1 is frozen.

## What FRWD is

FRWD is a general-purpose document format, not a CV maker, a slide deck, a web-page builder, or "HTML with an editor bolted on".

Today you choose between two bad options:

| | DOCX | HTML |
|---|---|---|
| Document editing | good | awkward |
| Web-native design and media | weak | excellent |
| AI generation and manipulation | awkward | excellent |
| User owns the file | yes | technically |

FRWD takes the right-hand column and makes it behave like a document.

A `.frwd` file is suitable for reports, proposals, papers, theses, manuals, portfolios, CVs, technical documentation, business documents, instructional material and rich digital publications.

## The five defining properties

- **F — Flowing.** Text behaves like a document, not a slide. Insert a paragraph and later content moves naturally. Pagination is derived from flow, never the underlying content model.
- **R — Rich.** Images, video, audio, equations, charts, galleries, data, callouts and interactive disclosure are first-class, not attachments.
- **W — Web.** HTML and CSS are the rendering foundation: real typography, responsive layout, browser portability, print CSS, accessibility primitives — and a representation coding models already understand.
- **D — Document.** A durable, user-owned artifact. Open it, edit it, save it, email it, archive it, print it. Not a URL. Not a cloud workspace.
- **AI-native.** Every structural object has stable identity, so AI edits target semantic objects through explicit operations instead of inferring the document from pixels or rewriting the whole file.

## How the format works

FRWD 0.1 uses **one HTML document as the native source** — not a ZIP container, not an application-specific JSON tree.

```text
report.frwd        native document
                   semantic HTML + metadata + CSS/theme + embedded media
                   + stable FRWD identifiers + declarative rich components
                   contains no arbitrary executable JavaScript

report.frwd.html   browser publication
                   the same document plus the trusted standard FRWD runtime
                   (edit mode, safe rich interactivity, Save As, print helpers)
                   ordinary HTML - opens in any modern browser, offline
```

Twelve invariants govern the design. Among them: semantic HTML is the canonical document; flow is the default layout model; the native document stays understandable without FRWD software; the native profile contains no arbitrary script; a browser publication remains useful with JavaScript disabled; print and PDF are output views, not the source; and the format depends on no single AI vendor, editor library or cloud service. See [`00_START_HERE.md`](plan/docs/00_START_HERE.md) for the full list — breaking one requires an ADR.

## Why open

The format is open. The reference implementation is open. Your documents belong to you, and no company is required to keep them readable.

Everything in this repository — specification and reference implementation — is Apache-2.0. Anyone may implement FRWD, including commercially. The patent grant is deliberate: FRWD aims to be a format, not an app.

The FRWD name and logo are reserved separately, so that "FRWD compatible" keeps meaning something. See [`NOTICE`](NOTICE).

## Repository layout

```text
frwd/
├─ plan/docs/       design pack and draft specification (authoritative)
│  └─ adr/          architecture decision records
├─ spec/            normative specification, promoted here when frozen
├─ docs/            public-facing documentation
├─ packages/
│  ├─ format/       parse, serialize, stable object identity
│  ├─ sanitize/     enforce the native no-script profile
│  ├─ operations/   deterministic semantic edit operations
│  ├─ publisher/    emit .frwd.html
│  └─ runtime/      the trusted browser runtime
├─ apps/editor/     reference editor
├─ fixtures/        reference documents - proof, not just test data
└─ tests/           conformance, roundtrip, security, browser, visual
```

The `packages/*` layer is deliberately framework-agnostic. No UI or editing framework is chosen until the editor is built, informed by what the format work teaches us.

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

## Development

Requires **Node 24 LTS** and **pnpm** (provided via Corepack).

```bash
corepack enable
pnpm install

pnpm typecheck      # TypeScript, whole workspace
pnpm test           # Vitest unit and conformance tests
pnpm test:browser   # Playwright against Chromium, Firefox and WebKit
```

## Documentation

Start with [`plan/docs/00_START_HERE.md`](plan/docs/00_START_HERE.md). It defines the invariants and the precedence order to use when documents conflict.

The draft format specification is [`plan/docs/02_FRWD_FORMAT_SPEC_V0_1.md`](plan/docs/02_FRWD_FORMAT_SPEC_V0_1.md).

## Contributing

Not yet — there is nothing meaningful to contribute to until the format package and conformance fixtures land. A `CONTRIBUTING.md` will arrive at that point. Issues and design discussion are welcome now.

## License

[Apache License 2.0](LICENSE). See [`NOTICE`](NOTICE) for the trademark position.
