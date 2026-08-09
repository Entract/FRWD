---
category: feature
---

# FRWD Design Pack

**Project:** FRWD  
**Expansion:** Flowing Rich Web Document  
**Pronunciation:** "forward"  
**Working native extension:** `.frwd`  
**Universal browser publication:** `.frwd.html`  
**Target specification:** FRWD 0.1  
**Status:** Pre-implementation design  
**Date:** 2026-08-09

## 1. Read this first

FRWD is **not** a CV maker, a presentation format, a web-page builder, or merely "HTML with an editor."

It is intended to be a new class of **general-purpose flowing document**:

> **Word-like editing and reflow, web-quality design, native rich media, and reliable AI editing — in a durable file.**

A FRWD document should be suitable for:

- reports;
- proposals;
- papers;
- theses;
- manuals;
- applications;
- portfolios;
- CVs;
- technical documentation;
- business documents;
- instructional material;
- newsletters;
- rich digital publications.

The CV is a useful demo, not the product definition.

## 2. The problem

AI can already generate attractive HTML/CSS extremely well.

AI can also generate DOCX, but the result is often visually mediocre, fragile, or constrained by office-document structures.

HTML has the opposite problem: it can be beautiful, responsive, animated and multimedia-rich, but ordinary users do not experience an HTML file as a convenient editable document.

FRWD closes that gap.

```text
DOCX
  good document editing
  weak web-native design/media
  awkward AI manipulation

HTML
  excellent design/media
  excellent AI generation
  awkward document editing

FRWD
  flowing document editing
  + HTML/CSS design
  + rich media
  + semantic AI operations
  + portable file
```

## 3. The five defining properties

A conforming FRWD experience must preserve all five.

### F — Flowing

Text behaves like a document, not a slide.

Insert a paragraph and later content moves naturally. Sections, lists, figures and tables participate in flow. Pagination is derived from flow rather than becoming the underlying content model.

### R — Rich

A document may natively contain:

- images;
- video;
- audio;
- equations;
- charts;
- galleries;
- data;
- callouts;
- interactive disclosure;
- later: 3D and other safe rich objects.

### W — Web

HTML and CSS are the rendering foundation.

This provides:

- excellent typography and layout;
- responsive behavior;
- browser portability;
- print CSS;
- accessibility primitives;
- a representation that coding models already understand extremely well.

### D — Document

A FRWD is a durable user-owned artifact.

It can be opened, edited, saved, copied, emailed, archived, versioned and printed. It is not merely a URL or cloud workspace.

### AI-native

AI does not need to infer the document from pixels or rewrite the entire file. Every structural object can have stable identity and can be edited through explicit semantic operations.

## 4. Fundamental architecture decision

FRWD 0.1 uses **one HTML document as the native source**, not a ZIP container.

```text
report.frwd
```

contains:

- semantic HTML;
- document metadata;
- CSS/theme;
- embedded media;
- FRWD structural identifiers;
- declarative rich-component definitions;
- optional non-executable document state.

The native `.frwd` profile contains **no arbitrary executable JavaScript**.

A browser publication:

```text
report.frwd.html
```

contains the same document plus the trusted standard FRWD browser runtime needed for:

- Edit mode;
- safe rich interactivity;
- Save As;
- print/export helpers.

The `.frwd.html` form is ordinary HTML and can be opened directly in a modern browser.

## 5. Critical invariants

Do not violate these without an Architecture Decision Record.

1. **Semantic HTML is the canonical document.**
2. **Flow is the default layout model.**
3. **Absolute-positioned canvas layout is not the default document model.**
4. **The native document must remain understandable without FRWD software.**
5. **Content and visual design are separable.**
6. **Rich media is first-class.**
7. **AI edits target stable semantic objects.**
8. **A normal document works completely offline.**
9. **The native profile does not contain arbitrary script.**
10. **A browser publication remains useful when JavaScript is disabled.**
11. **Print/PDF is an output view, not the source representation.**
12. **The format must not depend on one AI vendor, editor library, or cloud service.**

## 6. Specification precedence

If documents conflict, use this order:

1. `02_FRWD_FORMAT_SPEC_V0_1.md`
2. `03_FLOWING_DOCUMENT_MODEL.md`
3. `04_STYLE_LAYOUT_AND_PAGINATION.md`
4. `06_AI_NATIVE_EDITING_PROTOCOL.md`
5. `05_RICH_MEDIA_AND_INTERACTIVITY.md`
6. `09_SECURITY_TRUST_AND_PORTABILITY.md`
7. `07_EDITOR_ARCHITECTURE.md`
8. `08_BROWSER_PUBLICATION_ARCHITECTURE.md`
9. `11_TEST_AND_CONFORMANCE_PLAN.md`
10. `10_MVP_IMPLEMENTATION_PLAN.md`
11. `01_PRODUCT_VISION.md`
12. `12_PRIOR_ART_AND_POSITIONING.md`
13. `13_EXAMPLE_DOCUMENTS.md`
14. `14_FUTURE_ROADMAP.md`

## 7. Instructions to Codex / Claude

Before writing implementation code:

- read the complete design pack;
- do not turn FRWD into a slide/canvas editor;
- do not replace semantic HTML with an application-specific JSON document tree as the file format;
- do not build cloud collaboration before local file round-tripping works;
- do not add arbitrary JavaScript/macros to documents;
- do not build the AI chat UI before deterministic semantic operations work;
- do not optimize for DOCX compatibility at the expense of the FRWD model;
- do not create a second canonical representation that can drift from the HTML;
- write conformance fixtures early;
- record deviations from this design in `plan/docs/adr/`.

## 8. Repository layout

Canonical home: <https://github.com/Entract/FRWD>, Apache-2.0, public from the
first commit.

**This design pack lives in `plan/docs/` and that is its authoritative home.**
There is one copy of each document. `spec/` and `docs/` at the repository root
hold public-facing entry points that link here; normative documents are promoted
into `spec/` only when a version is frozen.

```text
frwd/
├─ LICENSE                Apache-2.0
├─ NOTICE                 attribution and trademark position
├─ plan/docs/             design pack and draft specification (authoritative)
│  └─ adr/                architecture decision records
├─ spec/                  normative specification, promoted when frozen
├─ docs/                  public-facing documentation
├─ packages/
│  ├─ format/             parse, serialize, stable object identity
│  ├─ sanitize/           enforce the native no-script profile
│  ├─ operations/         deterministic semantic edit operations
│  ├─ publisher/          emit .frwd.html
│  └─ runtime/            the trusted browser runtime
├─ apps/
│  └─ editor/             reference editor (framework chosen last)
├─ fixtures/
│  ├─ minimal/
│  ├─ cv/
│  ├─ scientific/
│  ├─ business-report/
│  └─ rich-manual/
└─ tests/
   ├─ conformance/
   ├─ roundtrip/
   ├─ security/
   ├─ browser/
   └─ visual/
```

Asset handling lives inside `packages/format` rather than a separate `assets`
package until there is a reason to split it.

Toolchain: TypeScript, Node 24 LTS, pnpm workspaces, Vitest, Playwright; Vite
when the editor arrives. `packages/*` stays framework-agnostic — invariant 12
constrains the format, not the reference editor's internals.

## 9. First proof, before a polished editor

The first meaningful proof is not a toolbar.

It is this:

```text
AI creates a beautiful FRWD report
        ↓
user opens it in FRWD editor
        ↓
clicks ordinary text and edits naturally
        ↓
adds a paragraph
        ↓
document reflows correctly
        ↓
moves a video block
        ↓
asks AI to restyle without changing content
        ↓
exports report.frwd.html
        ↓
recipient opens it offline in a browser
        ↓
recipient can read, play media, optionally edit, and Save As
        ↓
print/PDF still looks excellent
```

If this works, the core idea works.
