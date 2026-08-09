---
category: feature
---

# FRWD Master Design Specification

**Flowing Rich Web Document — consolidated agent handoff**

This file concatenates the modular FRWD design documents. When sections conflict, follow the precedence rules in `00_START_HERE.md`.


---

<!-- BEGIN 00_START_HERE.md -->

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

FRWD is a new class of **general-purpose flowing document**:

> **Word-like editing and reflow, web-quality design, native rich media, and reliable AI editing — in a durable file.**

It is general-purpose by design. Reports, proposals, papers, theses, manuals, portfolios, technical documentation, business documents, instructional material and rich digital publications are all the same kind of thing to FRWD: flowing semantic content with a visual design attached.

Those are examples of the range, not a list of supported document types. Any of them may be useful to build as a demonstration, but none of them defines the product, and none should acquire format features of its own.

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
- record deviations from this design in `/docs/adr/`.

## 8. Suggested repository

```text
frwd/
├─ docs/
│  ├─ design/
│  └─ adr/
├─ packages/
│  ├─ format/
│  ├─ sanitize/
│  ├─ operations/
│  ├─ assets/
│  ├─ publisher/
│  └─ runtime/
├─ apps/
│  └─ editor/
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

<!-- END 00_START_HERE.md -->


---

<!-- BEGIN 01_PRODUCT_VISION.md -->

# FRWD Product Vision

## 1. One-sentence definition

**FRWD is a flowing rich web document format and editor: Word-like editing, web-quality presentation, native multimedia, and semantic AI collaboration.**

## 2. Mental model

A useful shorthand is:

> **What would a general-purpose document look like if Word were invented after HTML, CSS, responsive design, video and AI?**

PDF primarily preserves final appearance.

FRWD aims to preserve:

- meaning;
- editable structure;
- visual design;
- embedded resources;
- interactive behavior;
- machine-addressable identity.

## 3. Why this exists

Modern AI systems have a strange asymmetry:

- they generate excellent HTML/CSS;
- they understand semantic HTML well;
- they can rewrite web layouts efficiently;
- but common office-file generation often produces weak visual results;
- and editing raw HTML remains inappropriate for ordinary document users.

FRWD makes HTML-quality output behave like a normal document.

## 4. The experience

A user should be able to say:

> Create a two-page technical proposal with restrained modern typography, a narrow evidence sidebar, three figures and an embedded 30-second demonstration video.

The AI generates the native FRWD.

The user then:

- clicks into a paragraph and types;
- presses Enter to make another paragraph;
- drags a figure between paragraphs;
- changes a heading;
- edits a table;
- replaces an image;
- asks AI to improve the design;
- prints it;
- sends the same document digitally.

The user should not need to know HTML.

## 5. Flowing text is the central distinction

A FRWD is not a composition of freely positioned rectangles.

Default behavior:

```text
Heading
Paragraph
Paragraph
Figure
Caption
Paragraph
Table
Paragraph
```

When content changes, later content reflows.

FRWD may support columns, sidebars, grids and designed regions, but those structures themselves contain document flow.

This distinguishes FRWD from presentation/canvas systems.

## 6. Web-quality design without web-authoring friction

FRWD should support the kinds of visual systems that HTML/CSS makes natural:

- responsive columns;
- sophisticated typography;
- spacing systems;
- cards and callouts;
- gradients/backgrounds when appropriate;
- elegant tables;
- CSS grid/flex layouts;
- print-specific layout;
- dark/light digital variants where the document chooses;
- graceful phone reflow.

The format should not reduce CSS to a lowest-common-denominator word processor.

At the same time, the editor should expose understandable document controls rather than presenting raw CSS to normal users.

## 7. Rich media is part of the document

An image is not the upper limit.

A FRWD may contain:

```text
[Video introduction]
[Interactive chart]
[Expandable methodology]
[Audio clip]
[Image gallery]
[Equation]
[Dataset-backed figure]
[Later: interactive 3D model]
```

Digital and print views differ appropriately.

Example: an embedded video may become a poster frame + title + optional URL/QR reference in print.

## 8. Design and content are separable

FRWD should make this request safe and normal:

> Keep every word and every content object exactly the same. Redesign the document.

The editor/AI can change:

- typography;
- spacing;
- theme tokens;
- widths;
- section styling;
- column behavior;
- figure presentation;
- responsive breakpoints;
- print rules;

without rewriting prose.

Conversely:

> Rewrite the discussion but do not alter layout or style.

should edit content only.

## 9. AI is a collaborator, not a file converter

AI operations should be semantic.

Examples:

> Shorten paragraph `p-42`.

> Move figure `fig-7` after the paragraph that discusses it.

> Make the sidebar narrower.

> Change the whole visual theme without changing content.

> Convert this three-item list into a comparison table.

> Add the supplied video after Section 2 and provide an accessible caption.

The AI should not need to regenerate the whole file for routine changes.

## 10. User ownership

FRWD is local-first.

A normal FRWD workflow must not require:

- login;
- cloud storage;
- subscription;
- online rendering;
- a proprietary server;
- AI access.

A document remains the user's file.

## 11. Target quality bar

FRWD output should be capable of matching the visual quality of a thoughtfully designed web page while preserving the editing expectations of a word processor.

That means the quality target is deliberately above:

- default AI-generated DOCX;
- generic Markdown renderers;
- plain contenteditable pages.

## 12. Non-goals

These are architectural boundaries rather than competitive positioning. Each would require a different document model, and adopting any of them would cost FRWD the flowing, portable, inspectable file that is the point of the format.

FRWD 0.1 is not:

- a slide or canvas format built from freely positioned objects;
- a website or application builder;
- a spreadsheet or calculation engine;
- a code, notebook or macro execution environment;
- a cloud-dependent workspace.

## 13. Long-term product identity

The format and the editor should be separable:

```text
FRWD
  ├─ open file format/specification
  ├─ reference editor
  ├─ browser publication runtime
  ├─ AI operation protocol
  └─ conformance suite
```

Success eventually means other tools can read and write FRWD without using the reference editor.

<!-- END 01_PRODUCT_VISION.md -->


---

<!-- BEGIN 02_FRWD_FORMAT_SPEC_V0_1.md -->

# FRWD Format Specification v0.1

**Status:** Draft  
**Format:** Flowing Rich Web Document  
**Extension:** `.frwd`  
**Encoding:** UTF-8  
**Canonical syntax:** HTML5-compatible document  
**Publication form:** `.frwd.html`

## 1. Core decision

A native FRWD file is **one self-contained HTML-family text document**, not a ZIP archive.

This is deliberate.

It allows:

- direct AI inspection;
- direct use of web parsers;
- graceful degradation;
- easy diffing/version control;
- no package extraction step;
- one-file ownership;
- an extremely direct path to browser publication.

## 2. Native and publication profiles

### 2.1 Native profile

`document.frwd`

The native profile:

- is the canonical editable source;
- is HTML5-compatible;
- contains no arbitrary executable script;
- contains all required assets inline;
- contains document CSS;
- contains FRWD metadata and stable IDs;
- contains declarative rich objects;
- may contain non-executable JSON metadata blocks.

A FRWD editor loads it as data, validates it, and renders it.

### 2.2 Browser publication profile

`document.frwd.html`

The publication profile:

- is ordinary `text/html`;
- contains the native document content;
- includes a trusted FRWD runtime;
- opens directly in modern browsers;
- supports safe rich interactivity;
- may expose an Edit mode;
- supports browser-based Save As;
- remains readable with JavaScript disabled.

## 3. Document skeleton

```html
<!doctype html>
<html lang="en" data-frwd-version="0.1">
<head>
  <meta charset="utf-8">
  <meta name="generator" content="FRWD">
  <meta name="frwd-document-id"
        content="550e8400-e29b-41d4-a716-446655440000">

  <title>Example FRWD</title>

  <script type="application/frwd+json" id="frwd-manifest">
  {
    "format": "frwd",
    "version": "0.1",
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Example FRWD",
    "created": "2026-08-09T09:00:00Z",
    "modified": "2026-08-09T09:00:00Z"
  }
  </script>

  <style id="frwd-document-style">
    /* document-owned CSS */
  </style>
</head>

<body>
  <main data-frwd-document>
    <article data-frwd-id="...">
      ...
    </article>
  </main>
</body>
</html>
```

`script[type="application/frwd+json"]` is non-executable data and MUST NOT contain JavaScript.

### 3.1 Doctype

A native FRWD document MUST begin with the HTML5 doctype:

```html
<!doctype html>
```

FRWD depends on predictable standards-mode HTML and CSS rendering. Layout, pagination and print behavior are all specified against it. A document that puts a browser into quirks mode is therefore not conforming FRWD, even though its content remains fully recoverable.

## 4. Canonical representation

The canonical document tree is the HTML inside:

```html
<main data-frwd-document>
```

There MUST NOT be a second full canonical JSON copy of the document tree.

An editor may use a transient internal model, but save must serialize back to semantic HTML.

## 5. Required metadata

The manifest MUST contain:

```json
{
  "format": "frwd",
  "version": "0.1",
  "documentId": "UUID",
  "title": "string",
  "created": "RFC3339 timestamp",
  "modified": "RFC3339 timestamp"
}
```

Recommended:

- `language`
- `authors`
- `description`
- `keywords`
- `generator`
- `generatorVersion`
- `license`
- `subject`
- `revision`

## 6. Stable structural IDs

Editable semantic nodes MUST use:

```html
data-frwd-id="<uuid>"
```

Required on independently editable block-level objects, including:

- article;
- section;
- headings;
- paragraphs;
- lists;
- list items;
- blockquotes;
- figures;
- captions;
- tables;
- rich components;
- sidebars/callouts;
- footnotes/references.

IDs MUST remain stable when the logical object survives an edit.

Copying a node as a new object creates new IDs.

## 7. Standard HTML first

When HTML already has an appropriate semantic element, use it.

Preferred:

```html
<section>
<h2>
<p>
<ol>
<li>
<figure>
<figcaption>
<table>
<blockquote>
<aside>
<address>
<time>
<math>
```

Avoid inventing `frwd-*` equivalents for ordinary HTML semantics.

## 8. FRWD custom elements

FRWD reserves the `frwd-` custom-element prefix for semantics that need behavior beyond standard HTML.

Initial vocabulary:

```text
<frwd-video>
<frwd-audio>
<frwd-chart>
<frwd-gallery>
<frwd-disclosure>
<frwd-callout>
<frwd-dataset>
<frwd-page-break>
```

Later:

```text
<frwd-model>
<frwd-citation>
<frwd-form-field>
```

Custom elements MUST have meaningful fallback content when possible.

## 9. Assets

FRWD 0.1 is self-contained.

Required assets MUST be embedded within the file.

### 9.1 Directly embeddable assets

For normal HTML media, use data URLs where practical:

```html
<img src="data:image/webp;base64,..."
     alt="Experimental apparatus">
```

```html
<video controls poster="data:image/webp;base64,...">
  <source src="data:video/mp4;base64,..." type="video/mp4">
</video>
```

### 9.2 Asset metadata

Large or significant assets SHOULD have a corresponding non-executable metadata entry:

```html
<script type="application/frwd-asset+json"
        data-frwd-asset-id="asset-123">
{
  "id": "asset-123",
  "mediaType": "video/mp4",
  "bytes": 18422312,
  "sha256": "...",
  "title": "Introduction"
}
</script>
```

The actual media remains accessible through standard HTML.

### 9.3 Size trade-off

Base64 increases encoded size. FRWD accepts this cost in the v0.1 self-contained profile in exchange for portability.

Future versions MAY define an external-asset project profile, but a conforming portable FRWD remains one file.

## 10. CSS

The document owns CSS in:

```html
<style id="frwd-document-style">
```

A conforming editor MUST preserve document styling unless intentionally changed.

CSS is part of the document, not merely editor configuration.

The native safe profile MUST reject remote imports such as:

```css
@import url(...);
```

and remote resource loads through CSS.

## 11. Fonts

For truly self-contained rendering, document-specific fonts MAY be embedded as data URLs via `@font-face`, subject to font licensing.

Editors MUST NOT assume they have permission to embed any installed font.

System font stacks are always valid.

## 12. Equations

MathML is the preferred canonical equation representation.

An editor MAY accept LaTeX input as an authoring convenience, but saved semantic output SHOULD be MathML.

## 13. Tables

Tables use standard semantic HTML.

Do not store table layout as positioned text boxes.

Support:

- caption;
- thead/tbody/tfoot;
- th scope;
- colspan/rowspan;
- responsive viewing strategies;
- print behavior.

## 14. Links

Normal links may use `https:` and internal fragments.

The native safe profile MUST reject:

- `javascript:`;
- unsafe executable data URLs;
- automatic file access;
- arbitrary custom executable schemes.

## 15. Scripts

Native `.frwd` MUST NOT contain executable scripts.

Forbidden:

```html
<script src="..."></script>
<script>...</script>
onclick="..."
onload="..."
```

Allowed:

```html
<script type="application/frwd+json">...</script>
```

because this is inert document data.

## 16. External dependencies

A portable native FRWD MUST NOT require remote:

- images;
- video;
- fonts;
- scripts;
- styles;
- data.

External hyperlinks are allowed because following a link is a user action.

## 17. Unknown safe elements

Readers SHOULD preserve unknown safe semantic content.

If an unknown `frwd-*` element is encountered, its fallback child content should remain readable.

## 18. Forward compatibility

Minor versions should favor additive changes.

An older editor opening a newer incompatible major version MUST warn before saving.

## 19. Publication transformation

Publishing:

```text
report.frwd
   ↓
report.frwd.html
```

MUST preserve:

- semantic content;
- stable IDs by default;
- document CSS;
- embedded assets;
- print style;
- accessibility data.

It adds:

- FRWD runtime JavaScript;
- runtime CSS if required;
- Edit mode UI code if publication profile requests it.

## 20. Renaming/degradation property

Because the native file uses HTML syntax, its content should remain intelligible to generic HTML tooling.

A raw `.frwd` renamed to `.html` SHOULD render its baseline static content, although advanced FRWD behavior may be absent.

This is a design property, not the primary user workflow.

## 21. Conformance and reference canonical serialization

These are two different things and must not be confused.

### 21.1 FRWD conformance

Conformance is **semantic**. A document conforms if it satisfies the requirements in this specification: the doctype, the version marker, the manifest, the document root, stable identifiers, the safe native profile, self-containment, and the rest.

Conformance says nothing about byte layout. Any writer may produce a conforming FRWD in whatever formatting it likes: its own attribute order, its own indentation, its own line endings. Two files that differ only in such details are equally conforming, and a conforming reader MUST accept both.

### 21.2 Reference canonical serialization

The reference implementation, `@frwd/format`, additionally defines a **canonical serialization**: a single deterministic byte representation for a given document tree.

At the time of writing it means attributes sorted with `data-frwd-id` first then alphabetically, text preserved exactly with no reindentation, and output ending precisely where the document ends.

Canonical serialization exists so that a no-op open/save produces no diff, so that documents diff meaningfully in version control, and so that the conformance fixtures can be stored as exact expected bytes.

It is a property of the reference implementation, not a requirement on FRWD writers. A third-party writer that emits semantically equivalent, conforming FRWD is conforming whether or not its bytes match ours. The rules of canonical serialization may change without changing what conforms.

<!-- END 02_FRWD_FORMAT_SPEC_V0_1.md -->


---

<!-- BEGIN 03_FLOWING_DOCUMENT_MODEL.md -->

# FRWD Flowing Document Model

## 1. Why "flowing" is non-negotiable

FRWD is a document format rather than a slide/canvas format because ordinary content participates in flow.

If a user inserts text here:

```text
Section heading
Paragraph A
[INSERT TWO PARAGRAPHS]
Figure
Paragraph B
Table
```

the figure, Paragraph B and the table move naturally.

The author should not repair coordinates.

## 2. Primary flow

Every document has a primary reading flow.

The default semantic sequence is DOM order.

This provides:

- natural editing;
- accessibility;
- AI comprehension;
- reflow;
- responsive behavior;
- print derivation.

Visual layout MUST NOT silently create a contradictory reading order.

## 3. Structural hierarchy

Recommended hierarchy:

```text
Document
└─ Article
   ├─ Header
   ├─ Section
   │  ├─ Heading
   │  ├─ Paragraph
   │  ├─ Figure
   │  ├─ Paragraph
   │  └─ Subsection
   ├─ Section
   └─ Footer / References
```

FRWD supports multiple valid document genres rather than enforcing one academic hierarchy.

## 4. Block objects

Core flow blocks:

- heading;
- paragraph;
- list;
- blockquote;
- code/pre;
- figure;
- table;
- rule;
- callout;
- rich media;
- section;
- aside;
- explicit page-break hint.

Blocks can normally be:

- selected;
- moved;
- duplicated;
- deleted;
- restyled;
- targeted by AI.

## 5. Inline content

Core inline content:

- text;
- strong/emphasis;
- underline where desired;
- strike;
- code;
- link;
- subscript/superscript;
- semantic spans;
- citation references later.

Inline formatting must not fragment the document into unnecessary spans.

## 6. Designed flow regions

A beautiful document sometimes needs more than one vertical column.

FRWD therefore permits **flow containers**:

### Columns

```text
┌─────────────────────────────────┐
│ column 1          column 2      │
│ flowing text      flowing text  │
└─────────────────────────────────┘
```

### Main + aside

```text
┌──────────────────────┬──────────┐
│ main flow            │ sidebar  │
│                      │ flow     │
└──────────────────────┴──────────┘
```

### Responsive grid of semantic blocks

```text
desktop: 3 cards in a row
mobile:  3 cards stacked
```

The content inside each region remains flowing.

## 7. CSS layout mechanisms

FRWD may use:

- normal flow;
- Flexbox;
- Grid;
- CSS columns;
- floats when appropriate;
- sticky behavior in digital view where it preserves semantics.

Avoid using absolute positioning for normal content.

## 8. Absolute positioning

v0.1 SHOULD NOT expose arbitrary free-positioning as a normal editor feature.

Reasons:

- breaks reflow;
- harms mobile behavior;
- complicates AI edits;
- creates overlap;
- encourages slide-like documents;
- weakens accessibility.

A future controlled "overlay" or "cover composition" feature may exist for special regions, but it must not contaminate the general document model.

## 9. Figures

A figure is a semantic block:

```html
<figure data-frwd-id="...">
  <img ...>
  <figcaption data-frwd-id="...">
    Figure 1. ...
  </figcaption>
</figure>
```

Rich figure bodies may use `frwd-chart`, `frwd-video`, etc.

Figures should support layout hints:

- normal;
- wide;
- full-bleed;
- float-start;
- float-end;
- centered;
- sidebar.

The hint influences CSS, not semantic reading order.

## 10. Sidebars

Use `<aside>` for complementary content.

A sidebar can be styled as:

- narrow right column;
- pull quote;
- facts panel;
- metadata panel;
- skills area in a CV;
- methodological note.

On narrow screens it SHOULD collapse into a sensible position in reading flow.

## 11. Cover regions

A cover may be visually strong while remaining semantic.

It may include:

- title;
- subtitle;
- author;
- image/video poster;
- metadata.

It should not require every item to become a free-positioned canvas object.

## 12. Content insertion behavior

Pressing Enter in a paragraph creates an adjacent paragraph.

Backspace at a boundary merges when semantically appropriate.

Pasting text creates semantic paragraphs/lists, not nested style garbage.

Dragging a block changes its place in semantic flow.

## 13. Reflow invariants

After any normal content edit:

- no unrelated block should overlap;
- reading order remains valid;
- width-constrained objects adapt;
- media respects container width unless explicitly full-bleed;
- layout should remain readable at supported widths.

## 14. Mobile reflow

A FRWD should be able to transform:

```text
desktop:
main 70% | sidebar 30%
```

into:

```text
mobile:
main
sidebar
```

without a second document.

The author/theme may define breakpoint behavior.

## 15. AI implication

AI should reason about:

```text
section -> paragraph -> figure -> paragraph
```

rather than:

```text
object x=312 y=744 width=520 height=180
```

Geometry may be measured at render time, but is not the normal semantic editing model.

<!-- END 03_FLOWING_DOCUMENT_MODEL.md -->


---

<!-- BEGIN 04_STYLE_LAYOUT_AND_PAGINATION.md -->

# FRWD Style, Layout and Pagination

## 1. Design goal

FRWD should allow documents to be as visually refined as well-designed web publications without making ordinary users become CSS authors.

## 2. Separation of concerns

A FRWD contains:

### Content
Semantic HTML and rich objects.

### Design system
CSS, tokens and reusable document styling.

### View-specific rules
Screen, mobile and print behavior.

These layers may live in one file, but the conceptual separation is important.

## 3. Theme tokens

FRWD editors SHOULD recognize a conventional token layer using CSS custom properties.

Example:

```css
:root {
  --frwd-font-body: "Inter", system-ui, sans-serif;
  --frwd-font-display: "Inter", system-ui, sans-serif;

  --frwd-text: #151515;
  --frwd-muted: #666;
  --frwd-surface: #fff;
  --frwd-accent: #315efb;

  --frwd-size-body: 11pt;
  --frwd-line-body: 1.5;
  --frwd-radius: 10px;
  --frwd-space: 8px;
  --frwd-content-width: 780px;
}
```

A visual editor can safely modify recognized tokens while preserving advanced CSS.

## 4. Two levels of styling control

### Friendly controls

For normal users:

- font;
- type scale;
- line spacing;
- margins;
- page size;
- accent color;
- content width;
- columns;
- block spacing;
- figure width;
- table style.

### Advanced design

For AI/designers:

- full document CSS;
- responsive queries;
- grid/flex behavior;
- custom classes;
- print-specific treatment.

All advanced changes still pass security validation.

## 5. Semantic style hooks

Nodes MAY carry:

```html
class="frwd-lead"
data-frwd-variant="lead"
```

Avoid editor-generated class-name soup.

Themes should use meaningful stable classes/variants.

## 6. Layout presets

The editor may expose semantic layout presets:

- single column;
- editorial;
- main + sidebar;
- two-column report;
- academic;
- narrow reading;
- profile/CV;
- technical manual.

These are templates/styles, not different file formats.

## 7. Responsive design

Screen rendering is allowed to adapt to viewport width.

A beautiful A4-style document can still have a mobile mode.

Example:

```css
@media (max-width: 720px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
```

This is one of FRWD's advantages over page-fixed office documents.

## 8. Print model

Print is a derived view using CSS.

Use:

```css
@media print { ... }

@page {
  size: A4;
  margin: 16mm;
}
```

The editor SHOULD provide a print preview.

## 9. Pagination

Normal document editing is continuous-flow.

Pages appear as a print/layout visualization.

Do not insert hard page wrappers around ordinary paragraphs in the canonical content.

## 10. Page break hints

Authors may intentionally request breaks.

Use a semantic element or attribute such as:

```html
<frwd-page-break data-frwd-id="..."></frwd-page-break>
```

or a supported CSS break rule.

A page break is a print/layout hint, not a container for page content.

## 11. Avoiding bad page breaks

Print CSS SHOULD attempt to avoid:

- headings stranded at page bottoms;
- captions separated from figures;
- single list items orphaned;
- table headers disappearing on later pages.

Use standard break properties where supported.

## 12. Digital-only content

Some content is meaningful only interactively.

A component MUST define print fallback.

Examples:

### Video
Digital: playable video.  
Print: poster image + title + optional link/QR reference.

### Interactive chart
Digital: controls/hover/filter.  
Print: static chart state + caption.

### Disclosure
Digital: collapsible.  
Print: expanded content unless author explicitly suppresses it.

## 13. Page-count constrained authoring

FRWD MAY support a useful higher-level feature:

> Target 2 pages when printed.

This is a constraint, not a fixed source geometry.

The editor can show:

```text
Print target: 2 pages
Current: 3 pages
```

AI can then make intentional choices:

- condense wording;
- reduce gaps;
- alter layout;
- adjust type within limits.

It must not silently shrink text below accessible/readable thresholds.

## 14. Design-only AI operations

The system should support a protected operation mode:

```text
content_locked = true
```

so a request such as:

> Redesign this document without altering its text or media.

can be validated.

## 15. Content-only AI operations

Likewise:

```text
style_locked = true
```

for:

> Rewrite this section without changing the design.

This separation should be visible in AI tooling and diffs.

<!-- END 04_STYLE_LAYOUT_AND_PAGINATION.md -->


---

<!-- BEGIN 05_RICH_MEDIA_AND_INTERACTIVITY.md -->

# FRWD Rich Media and Interactivity

## 1. Principle

A modern document should not treat static images as the final form of media.

FRWD makes rich objects first-class while preserving:

- flow;
- accessibility;
- offline portability;
- print fallbacks;
- security.

## 2. v0.1 rich object set

Required:

- image;
- video;
- audio;
- figure/caption;
- callout;
- disclosure;
- simple chart;
- embedded dataset metadata.

Optional for the first editor release:

- gallery.

Deferred:

- 3D;
- forms;
- live external data;
- arbitrary embeds.

## 3. Video

Prefer standard HTML video semantics.

FRWD wrapper:

```html
<frwd-video data-frwd-id="video-uuid">
  <figure>
    <video controls
           preload="metadata"
           poster="data:image/webp;base64,...">
      <source src="data:video/mp4;base64,..." type="video/mp4">
    </video>
    <figcaption data-frwd-id="caption-uuid">
      Short introduction.
    </figcaption>
  </figure>
</frwd-video>
```

Metadata may include:

- title;
- duration;
- transcript;
- poster;
- print link;
- accessibility description.

## 4. Video editing behavior

The editor should allow:

- replace video;
- set poster frame;
- edit caption;
- trim metadata later;
- set playback controls;
- choose print fallback.

It should not become a full video editor.

## 5. Audio

Same pattern:

- standard `<audio>`;
- caption/title;
- transcript where available;
- print fallback description/link.

**Do not read anything into preload behaviour.** `preload` is a hint the HTML specification explicitly permits a user agent to ignore, and engines differ: an element sitting at `readyState 0` until playback is requested is conforming behaviour, not a broken document. Conformance tools and editors must judge embedded media by whether it plays when asked, never by whether the browser chose to fetch it eagerly.

## 6. Charts

FRWD charts are declarative.

Example:

```html
<frwd-chart
  data-frwd-id="..."
  data-type="bar"
  data-source="dataset-1"
  data-x="quarter"
  data-y="revenue">

  <figure>
    <img src="data:image/svg+xml;base64,..."
         alt="Revenue increased across four quarters.">
    <figcaption>Quarterly revenue.</figcaption>
  </figure>
</frwd-chart>
```

The runtime hydrates interaction.

The static child figure is the baseline fallback.

## 7. Dataset

Datasets may be stored as inert data:

```html
<script type="application/frwd-dataset+json"
        id="dataset-1">
{
  "columns": ["quarter", "revenue"],
  "rows": [
    ["Q1", 10],
    ["Q2", 13]
  ]
}
</script>
```

This is data, not executable script.

Larger CSV-like data may be encoded in an inert asset block in a future minor spec.

## 8. Disclosure

Use standard `<details>/<summary>` where it solves the problem.

Do not invent a FRWD component unnecessarily.

Example use:

- methodology detail;
- footnote explanation;
- supplementary information.

Print defaults to expanded.

**How that is achieved matters.** Print expansion is done in CSS, not in a `beforeprint` handler, because a publication must print correctly with JavaScript disabled — a script-driven expansion would drop content from exactly the printouts nobody can debug.

That constrains which disclosure to reach for. `frwd-disclosure` uses an ordinary `hidden` attribute, which CSS can override in every engine, so its content always prints. A closed native `<details>` cannot be force-expanded by CSS in every engine: `::details-content` covers Chromium and Firefox, WebKit has no equivalent today.

Therefore:

- use `<details>` freely for supplementary content the reader can take or leave;
- put **substantive** content that must reach paper in a `frwd-disclosure`, or author the `<details>` as `<details open>`.

## 9. Callout

A callout is semantic supporting content:

```html
<aside data-frwd-id="..." class="frwd-callout">
  ...
</aside>
```

A custom element is not required unless the editor needs additional state.

## 10. Galleries

A gallery is ordered media with:

- images/video;
- captions;
- accessible labels;
- static stacked/grid fallback.

Do not require a carousel runtime to understand its contents.

## 11. 3D future profile

A later `<frwd-model>` may support self-contained GLB.

Required future properties:

- poster;
- alt/description;
- safe trusted viewer runtime;
- no embedded arbitrary model scripts;
- print fallback;
- performance/size limits.

Do not implement before the basic document model is proven.

## 12. No arbitrary web embeds

v0.1 does not allow:

```text
iframe any website
YouTube embed
remote dashboard
arbitrary JavaScript widget
```

These undermine:

- offline portability;
- privacy;
- security;
- archival durability.

A future explicitly non-portable profile could consider controlled external embeds.

## 13. Media and AI

AI tools should receive media metadata and semantic relationships, not massive base64 payloads by default.

For example:

```json
{
  "nodeId": "video-7",
  "type": "video",
  "title": "Instrument setup",
  "duration": 21.4,
  "caption": "..."
}
```

The tool layer resolves/replaces actual bytes separately.

## 14. Print fallback contract

Every rich component MUST define one of:

- static representation;
- expanded representation;
- explicit print omission with visible textual reference.

No component should silently disappear from print if it carries substantive content.

<!-- END 05_RICH_MEDIA_AND_INTERACTIVITY.md -->


---

<!-- BEGIN 06_AI_NATIVE_EDITING_PROTOCOL.md -->

# FRWD AI-Native Editing Protocol

## 1. Objective

AI should modify a FRWD through small, semantic, reviewable changes.

Routine editing MUST NOT require whole-document regeneration.

## 2. Stable identity

Every independently editable object has `data-frwd-id`.

Example:

```html
<p data-frwd-id="8b0a...">
  This is the current paragraph.
</p>
```

AI addresses `8b0a...`, not "the third paragraph on page 2."

## 3. Revision identity

The manifest SHOULD maintain:

```json
{
  "revision": 42
}
```

Every committed semantic transaction increments revision.

AI operations include a `baseRevision`.

Stale operations must be rejected or explicitly rebased.

## 4. Operation envelope

```json
{
  "protocol": "frwd-ops",
  "version": "0.1",
  "documentId": "document-uuid",
  "baseRevision": 42,
  "constraints": {
    "contentLocked": false,
    "styleLocked": true
  },
  "operations": []
}
```

## 5a. Three layers, and why the distinction matters

The protocol below is easy to over-extend. Keeping these three apart is what stops FRWD from quietly becoming a design system.

### Core FRWD operations

A small, closed set of deterministic operations over the document model: replace text, replace a node, insert, delete, move, set an attribute, set a theme token. They are normative, they mean the same thing in every conforming implementation, and every one of them is expressible against any FRWD document without knowing anything about that document's design.

### Document-defined style classes and variants

`wide`, `main-sidebar`, `lead`, `safety` — these are classes a document or theme chooses. They are **not** FRWD concepts, and they do not become FRWD concepts merely because a reference fixture uses them. Two conforming FRWD documents may share no class names at all.

The mechanism for changing them already exists and needs no new vocabulary:

```json
{ "op": "set_attribute", "target": "figure-uuid", "name": "class", "value": "wide" }
```

Standardising an enumeration of variants at format level would freeze one design vocabulary into the format and make every document that disagreed with it non-idiomatic. FRWD provides safe mechanisms for changing document-owned design; it does not standardise the design vocabulary of individual documents.

### High-level agent and editor tools

Convenience sits here, above the protocol rather than inside it. A tool such as:

```text
set_figure_variant(figure_id, "wide")
```

is an editor or agent affordance. It inspects which variants the current document's stylesheet actually defines, decides what to do, and **compiles down to core operations** — in that example, a single `set_attribute`. It is free to be heuristic, model-driven and document-specific, because nothing downstream depends on it: the transaction that reaches the document is still made of core operations, and is still atomic, staged and validated.

The test for which layer something belongs to: *could two conforming implementations disagree about what it should do?* If yes, it is a tool, not an operation.

Deferred for the same reason: `set_print_target_pages` is an optimisation goal rather than a deterministic document operation — "make this fit two pages" has many valid answers and depends on the rendering engine — and arbitrary stylesheet-region replacement is a large hole in the safety story with no demonstrated need yet.

## 5. Core operations

### Replace text

```json
{
  "op": "replace_text",
  "target": "paragraph-uuid",
  "text": "Replacement paragraph text."
}
```

### Replace node

```json
{
  "op": "replace_node",
  "target": "node-uuid",
  "html": "<blockquote data-frwd-id=\"new-uuid\">...</blockquote>"
}
```

### Insert before / after

```json
{
  "op": "insert_after",
  "target": "paragraph-uuid",
  "html": "<p data-frwd-id=\"new-uuid\">New paragraph.</p>"
}
```

### Append/prepend child

Used for section contents or list items.

### Delete node

```json
{
  "op": "delete_node",
  "target": "node-uuid"
}
```

### Move node

```json
{
  "op": "move_node",
  "target": "figure-uuid",
  "destination": "paragraph-uuid",
  "position": "after"
}
```

### Set safe attribute

```json
{
  "op": "set_attribute",
  "target": "image-uuid",
  "name": "alt",
  "value": "..."
}
```

### Set variant/class

Use controlled semantic variants.

### Set theme token

Changes a CSS custom property in the document stylesheet. The one style operation in v0.1.

```json
{
  "op": "set_theme_token",
  "name": "--accent",
  "value": "#2458a6",
  "scope": "default"
}
```

`scope` is `default` or `dark`, and is explicit rather than inferred. Designed documents pair a light value with a `prefers-color-scheme: dark` counterpart under the same token name, so "set --accent" is not a question that can be answered by position; an operation that picked one would silently change the wrong half of a theme.

The stylesheet is edited through a CSS syntax tree, never by string replacement. Editing CSS with a regular expression is guessing, and a guess that lands inside a declaration produces a stylesheet nobody wrote.

Rules:

- the token name MUST be a custom property, beginning `--`;
- if more than one `:root` rule in the requested scope declares the token, the operation is REFUSED rather than resolved by source order;
- if the scope has several `:root` rules and none declares the token, it is REFUSED, because there is no non-arbitrary place to add it;
- if the scope has no `:root` rule at all, one is created, which for `dark` means creating the media query too;
- the resulting stylesheet MUST satisfy the native CSS safety profile, so a token value cannot smuggle in a remote reference;
- the operation is rejected under `styleLocked` and permitted under `contentLocked`, because it changes appearance and no content.

### Replace stylesheet region

Deferred. See section 5a.

### Add/replace asset

Bytes are handled by host tooling; AI refers to logical asset IDs.

## 6. Atomicity

A multi-operation transaction is atomic.

If operation 4 of 7 fails validation, none are committed.

## 7. Validation

Before apply:

1. document ID check;
2. base revision check;
3. target resolution;
4. HTML parse;
5. sanitizer;
6. structure validation;
7. duplicate-ID check;
8. asset check;
9. style constraint check;
10. transaction preview;
11. commit.

## 8. Content lock

For a design-only request:

```json
"constraints": {
  "contentLocked": true
}
```

The operation validator rejects changes to:

- textual content;
- semantic content order;
- media identity;
- captions;
- substantive attributes.

Style/layout changes remain allowed.

## 9. Style lock

For a content-only request:

```json
"constraints": {
  "styleLocked": true
}
```

The validator rejects:

- CSS changes;
- class/variant changes;
- layout changes.

## 10. AI tool interface

A model should usually receive tools such as:

```text
get_document_summary()
get_outline()
get_node(node_id)
get_children(node_id)
search_document(query)
get_style_summary()
get_theme_tokens()
get_media_metadata(node_id)
preview_operations(transaction)
apply_operations(transaction)
validate_document()
```

Do not send megabytes of embedded video/base64 to the model.

## 11. High-level layout tools

These are tools, not operations - the third layer of section 5a. They live in an editor or an agent, they may be heuristic and document-specific, and they compile down to core operations before anything reaches a document.

```text
set_layout_variant(section_id, variant)   -> set_attribute(section_id, "class", ...)
set_figure_variant(figure_id, variant)    -> set_attribute(figure_id, "class", ...)
set_document_theme(theme_patch)           -> one set_theme_token per token
```

The variant names are whatever the document's own stylesheet defines. A tool discovers them by reading that stylesheet; it does not consult a list in this specification, because there is deliberately no such list.

`set_print_target_pages` is deferred. Fitting a document to a page count is an optimisation goal with many valid answers, dependent on the rendering engine - which makes it a job for a tool that can measure and iterate, and a poor fit for a deterministic operation.

## 12. AI-created documents

For initial generation, whole-document creation is valid.

After creation, the system should switch to semantic incremental edits.

## 13. Human-readable diff

Primary review UI:

```text
Changed
  Introduction / paragraph 3
  63 words -> 47 words

Moved
  Figure 2
  from end of Results
  to after paragraph discussing tensile strength

Design
  Sidebar width 32% -> 26%
  Body line-height 1.55 -> 1.48

Unchanged
  All other content
```

Raw HTML diff is secondary.

## 14. Provenance

Optional revision history may record:

- timestamp;
- actor type (`human`, `ai`, `importer`, `system`);
- model/tool label;
- operations;
- user request summary.

This is audit metadata, not cryptographic proof.

## 15. Reversible edits

The editor should maintain undo/redo transactions.

AI changes should be one or more coherent undoable units.

## 16. Important design rule

The AI protocol is part of the FRWD ecosystem, but FRWD files must remain editable without AI.

AI is not required for format conformance.

<!-- END 06_AI_NATIVE_EDITING_PROTOCOL.md -->


---

<!-- BEGIN 07_EDITOR_ARCHITECTURE.md -->

# FRWD Reference Editor Architecture

## 1. Product experience

The editor should feel like a document editor, not a code editor.

Core surface:

```text
┌────────────────────────────────────────────────────────┐
│ File Edit Insert Format View      Ask AI      Publish  │
├─────────────┬─────────────────────────────┬────────────┤
│ Outline     │                             │ Properties │
│             │        DOCUMENT             │            │
│ Overview    │                             │ Layout     │
│ Experience  │                             │ Media      │
│ Results     │                             │ Style      │
│ ...         │                             │ A11y       │
└─────────────┴─────────────────────────────┴────────────┘
```

## 2. Recommended technical stack

Reference implementation:

- TypeScript;
- React;
- Vite or equivalent;
- ProseMirror/Tiptap-class structured rich-text engine;
- DOM/CSS-native rendering;
- Playwright tests.

The saved format MUST NOT depend on any editor library's JSON schema.

## 3. Why a structured editor engine

Raw `contenteditable` alone is insufficient for robust:

- selection;
- schema enforcement;
- tables;
- lists;
- undo;
- paste normalization;
- block operations;
- collaborative-style transactions;
- stable serialization.

Use browser editing primitives through a mature structured layer.

## 4. Load pipeline

```text
Choose/open .frwd
      ↓
Read as text
      ↓
Parse HTML without executing it
      ↓
Validate FRWD metadata
      ↓
Sanitize HTML/CSS
      ↓
Extract document style/assets
      ↓
Parse <main data-frwd-document>
      ↓
Map to transient editor model
      ↓
Render
```

Never inject untrusted source into a live page before sanitization.

## 5. Save pipeline

```text
Editor model
      ↓
Serialize semantic HTML
      ↓
Restore stable FRWD IDs
      ↓
Normalize assets
      ↓
Serialize document CSS
      ↓
Update manifest/revision/timestamp
      ↓
Validate
      ↓
Write one .frwd text file
```

## 6. File access tiers

### Tier A — universal

`Open file` and `Save As` using standard browser file picker/download behavior.

### Tier B — enhanced browser/PWA

Where File System Access is supported and user permission is granted:

- open local file handle;
- save directly;
- autosave optionally.

### Tier C — installed PWA/file association

Where supported, register `.frwd` with the installed editor.

### Tier D — optional native shell

Only if needed later.

The format cannot depend on Tier D.

## 7. WYSIWYG model

The editing surface should use the same CSS model as final rendering as much as practical.

Avoid:

```text
editor approximates layout
publisher has a different renderer
```

Prefer:

```text
same semantic DOM
same document CSS
editor adds non-persistent editing chrome
```

## 8. Editor chrome

Selection boxes, resize handles, toolbars and AI controls MUST NOT serialize into the document.

## 9. Block controls

When hovering/selecting a block, allow:

- drag;
- duplicate;
- delete;
- move;
- change variant;
- Ask AI;
- inspect.

Text remains directly editable.

## 10. Media controls

Image/video:

- replace;
- resize within semantic layout rules;
- caption;
- alt text;
- alignment/variant;
- print fallback;
- poster for video.

Avoid arbitrary pixel-coordinate movement.

## 11. Style inspector

Expose:

### Document
- page target;
- content width;
- base type;
- theme colors;
- spacing.

### Section/block
- variant;
- background;
- columns;
- sidebar layout;
- width;
- break hints.

### Advanced
- controlled CSS source.

## 12. Source mode

Provide source mode for advanced users/developers.

It shows:

- semantic document HTML;
- document CSS;
- manifest/data blocks.

Changes must pass the same validator.

## 13. Outline

Generate outline from semantic sections/headings.

Do not maintain a separate manual outline model that can drift.

## 14. Undo

Human and AI edits use a common transaction system.

An AI action should be undoable exactly like a human action.

## 15. Autosave/recovery

If direct file write is available:

- debounced autosave is optional.

Always maintain crash recovery in local browser storage.

Recovery must never silently overwrite the canonical user file.

## 16. AI UX

AI should be contextual.

Possible surfaces:

- document-level Ask AI;
- block-level Ask AI;
- selection-level Ask AI;
- design assistant;
- print constraint assistant.

Do not make chat the only interface.

## 17. MVP editor limitations

Do not initially implement:

- comments;
- realtime multiplayer;
- change tracking comparable to Word;
- DOCX import fidelity;
- arbitrary vector drawing;
- macro/plugins;
- 3D editing;
- mail merge.

Prove flowing editing + beautiful style + rich media first.

<!-- END 07_EDITOR_ARCHITECTURE.md -->


---

<!-- BEGIN 08_BROWSER_PUBLICATION_ARCHITECTURE.md -->

# FRWD Browser Publication Architecture

## 1. Goal

A user must be able to send a FRWD publication to someone who has never installed FRWD.

The recipient receives:

```text
report.frwd.html
```

and opens it in an ordinary modern browser.

## 2. Publication contains

The publication is one physical HTML file containing:

- semantic document;
- document CSS;
- all required assets;
- trusted FRWD runtime;
- interaction definitions;
- optional editor UI/runtime;
- print rules.

No server is required.

## 3. Publication profiles

### Read profile

Smallest runtime.

Supports:

- rich components;
- print;
- accessibility helpers.

### Editable profile

Includes:

- read capabilities;
- Edit button;
- browser editor;
- undo;
- Save As.

Default MVP publication SHOULD be editable unless file size/runtime complexity becomes unacceptable.

## 4. Baseline without JavaScript

With JavaScript disabled, the user should still see:

- title;
- headings;
- prose;
- images;
- tables;
- captions;
- playable standard media where the browser supports it;
- static chart fallbacks;
- expanded/visible fallback information.

Advanced interaction/editing may disappear.

## 5. Edit mode

On user action:

```text
[Edit]
```

the runtime:

1. validates embedded FRWD structures;
2. initializes the editor;
3. enables normal rich-text editing;
4. exposes block/media controls;
5. records changes;
6. lets the user generate an updated file.

## 6. Saving from a self-contained HTML file

A page opened directly from local disk normally does not have unrestricted permission to overwrite itself.

Therefore universal behavior is:

```text
Edit
  ↓
Save
  ↓
Generate updated one-file HTML
  ↓
Save As / browser download
```

Where a trusted installed editor/PWA has an authorized file handle, direct save can be offered.

The universal promise is **editable and saveable**, not "every browser can silently overwrite the original file."

## 7. Publishing from `.frwd`

Conceptually:

```text
native .frwd
   +
standard runtime
   =
.frwd.html
```

The publisher MUST NOT:

- flatten text to canvas;
- rasterize the document;
- replace semantics with coordinates;
- require external CDNs.

## 8. Runtime ownership

The runtime is publisher-owned standard code.

Document authors may declare behavior but cannot provide arbitrary executable code in conforming FRWD.

Example:

```html
<frwd-chart data-type="line" ...>
```

The trusted runtime supplies chart behavior.

## 9. Runtime version

Published files SHOULD record:

```html
<meta name="frwd-runtime-version" content="0.1.x">
```

Old documents remain self-contained because their runtime travels with them.

## 10. Runtime upgrades

An editor may offer:

> Upgrade embedded FRWD runtime

This should not alter document content.

A file should never require a future server to obtain its old runtime.

## 11. Size considerations

Embedding a runtime in every file costs bytes.

This is acceptable if:

- baseline runtime remains compact;
- optional capabilities are modular at publish time;
- only used rich-component modules are included where practical.

Example:

A text/image report should not embed a 3D viewer.

## 12. Offline requirement

A portable `.frwd.html` must work with networking disabled.

Opening it should not automatically contact:

- analytics;
- font servers;
- CDNs;
- AI endpoints;
- FRWD servers.

Optional AI functions may require network access only after explicit user action and configuration.

## 13. Browser support

Target current major engines:

- Chromium;
- Firefox;
- WebKit/Safari.

The release process pins tested versions.

FRWD content should use standards-based HTML/CSS rather than relying on one browser engine.

## 14. Print

The same publication prints using document print CSS.

Editor controls never appear in print.

## 15. Useful archival property

Even if the FRWD runtime stops working decades later, the file should still contain normal semantic HTML and embedded media that generic tooling can recover.

<!-- END 08_BROWSER_PUBLICATION_ARCHITECTURE.md -->


---

<!-- BEGIN 09_SECURITY_TRUST_AND_PORTABILITY.md -->

# FRWD Security, Trust and Portability

## 1. Threat model

A FRWD may arrive from an untrusted sender.

Risks include:

- script execution;
- network tracking;
- malicious CSS;
- phishing UI;
- oversized assets;
- hostile SVG;
- unsafe URLs;
- parser denial of service;
- AI-generated dangerous markup;
- maliciously modified `.frwd.html`.

## 2. Native safety principle

A native `.frwd` is **data, not software**.

It contains no arbitrary executable script.

The editor parses it without executing source content.

## 3. HTML sanitizer

Reject/remove at minimum:

- executable `<script>`;
- inline event handlers;
- `<object>`;
- `<embed>`;
- unsafe iframe;
- `<base>`;
- meta refresh;
- `javascript:` URLs;
- dangerous executable schemes;
- unauthorized custom elements;
- remote scripts/styles;
- automatic remote media.

## 4. CSS sanitizer

The safe portable profile must prevent CSS from causing automatic remote fetches.

Review or reject:

- `@import`;
- remote `url(...)`;
- behavior inconsistent with supported browsers;
- CSS designed to obscure/impersonate editor security UI.

Allow rich local styling.

## 5. SVG

SVG can carry active content.

Sanitize:

- scripts;
- event handlers;
- external references;
- unsafe `foreignObject`;
- unsafe URLs.

The editor may offer a strict mode that rasterizes hostile/unsupported SVG.

## 6. Publication HTML caveat

A `.frwd.html` is ultimately an HTML program because it contains the standard runtime.

A malicious sender can modify any HTML file outside the FRWD specification.

Therefore:

- a conforming publication is safe-by-design;
- FRWD software can validate a publication;
- ordinary browsers cannot prove that an arbitrary received HTML file contains only the official runtime.

Treat unknown `.html` files with the normal trust expectations of web content.

Do not make misleading claims that the file extension alone makes HTML safe.

## 7. Network-free default

Conforming portable FRWD must make no automatic network requests.

External hyperlinks are permitted because the user chooses to follow them.

## 8. Asset limits

The editor must defend against:

- extremely large base64 data;
- excessive DOM node counts;
- decompression-like encoded asset abuse;
- huge SVG complexity;
- video memory pressure.

Use configurable limits and progressive loading.

## 9. Embedded video

Do not decode all media at document load.

Use:

- metadata preload;
- poster images;
- lazy loading where supported;
- user playback.

## 10. Integrity

The manifest MAY record SHA-256 hashes for significant embedded assets.

Hashing supports corruption detection, not authorship.

## 11. Digital signatures

Deferred.

Do not invent custom cryptography in v0.1.

A later profile can sign a canonicalized document + asset digest list.

## 12. AI output is untrusted

Model output must pass:

- HTML sanitizer;
- CSS sanitizer;
- structural validation;
- ID uniqueness validation;
- URL validation;
- asset validation.

AI does not receive a privileged bypass.

## 13. File ownership/privacy

Basic editor functionality should work locally.

The FRWD editor must not upload the user's document merely to open or render it.

If cloud AI is invoked, the product must make clear which content is being sent according to the configured AI provider/workflow.

## 14. No hidden tracking

Portable documents cannot include silent analytics/tracking under the conforming profile.

## 15. Graceful portability

If FRWD software is unavailable:

- `.frwd` remains HTML-family text;
- normal text and markup can be extracted;
- embedded media uses standard encodings/types;
- `.frwd.html` can be opened directly as HTML.

This is an intentional anti-lock-in property.

<!-- END 09_SECURITY_TRUST_AND_PORTABILITY.md -->


---

<!-- BEGIN 10_MVP_IMPLEMENTATION_PLAN.md -->

# FRWD MVP Implementation Plan

## 1. MVP goal

Prove one proposition:

> A general-purpose document can combine normal flowing editing, beautiful web-native design, rich media, semantic AI editing and one-file browser distribution without becoming a slide editor or a cloud app.

## 2. Build order

Do not begin with AI chat or polished toolbars.

### Phase 0 — repository

Create packages/apps/tests from `00_START_HERE.md`.

Add ADR process.

### Phase 1 — FRWD parser/validator

Implement:

- read `.frwd` as UTF-8;
- parse without executing;
- read manifest;
- locate `main[data-frwd-document]`;
- validate stable IDs;
- sanitize HTML;
- sanitize CSS;
- validate data URLs/assets;
- diagnostics.

CLI:

```bash
frwd validate document.frwd
frwd inspect document.frwd
```

### Phase 2 — hand-authored fixtures

Create:

1. minimal document;
2. beautiful CV/profile document;
3. scientific report;
4. business report;
5. rich technical manual with embedded video.

Do this before the editor.

The purpose is to prove that the **format itself** can express the desired output.

### Phase 3 — publisher

Implement:

```bash
frwd publish input.frwd --editable
```

Output:

```text
input.frwd.html
```

Must work offline in Chromium, Firefox and WebKit.

### Phase 4 — minimal editor

Required:

- open `.frwd`;
- click/type flowing text;
- headings;
- paragraphs;
- lists;
- inline formatting;
- undo/redo;
- block movement;
- insert image;
- insert video;
- captions;
- basic tables;
- document styles;
- save `.frwd`;
- publish `.frwd.html`;
- print preview.

### Phase 5 — design controls

Add:

- theme tokens;
- typography;
- content width;
- layout variants;
- sidebar;
- figure variants;
- responsive preview;
- print target.

### Phase 6 — semantic operation engine

Implement FRWD Ops before connecting an LLM.

Developer UI:

```text
Paste operation transaction
[Validate]
[Preview]
[Apply]
```

Test revisions, atomicity and locks.

### Phase 7 — AI integration

First supported workflows:

1. rewrite selection;
2. shorten section;
3. move/restructure blocks;
4. redesign while content locked;
5. content edit while style locked;
6. "fit to N printed pages" with safeguards.

### Phase 8 — rich chart

Implement one declarative chart component with static fallback.

### Phase 9 — PWA/file handling

Add:

- installable editor;
- `.frwd` file association where supported;
- direct save where supported;
- universal Save As fallback.

## 3. First five fixtures

### `minimal.frwd`

Proves semantic flow.

### `profile.frwd`

A visually sophisticated CV/profile:
- two-column desktop;
- one-column mobile;
- portrait;
- optional short intro video;
- print fallback.

This is a demo of the format, not a dedicated CV feature.

### `scientific-report.frwd`

- abstract;
- sections;
- MathML equation;
- figure;
- table;
- references;
- supplementary video.

### `business-report.frwd`

- cover;
- KPI callouts;
- table;
- chart;
- sidebar;
- print.

### `rich-manual.frwd`

- instructions;
- callouts;
- image;
- embedded short video;
- disclosure detail;
- printable fallback.

## 4. Explicitly deferred

- DOCX import/export;
- PDF import;
- collaboration;
- comments;
- full tracked changes;
- 3D;
- arbitrary plugins;
- macros;
- encrypted files;
- signatures;
- cloud accounts;
- template marketplace.

## 5. MVP completion criteria

All must be true:

- `.frwd` source is one file;
- all fixtures validate;
- editor round-trips semantic IDs;
- a paragraph can grow substantially without manual repositioning;
- designed sidebars/columns reflow on mobile;
- embedded video survives save/open;
- standalone `.frwd.html` works offline;
- JS-disabled publication remains readable;
- print/PDF is credible;
- AI can perform a targeted edit without rewriting unrelated content;
- AI can redesign with content locked;
- malicious fixtures are sanitized/rejected.

## 6. Important implementation discipline

The first visual editor can be plain.

The first **documents cannot be ugly**.

FRWD's central product claim is that web-native design gives AI and users a better visual ceiling than conventional generated office documents. Reference fixtures must demonstrate that immediately.

<!-- END 10_MVP_IMPLEMENTATION_PLAN.md -->


---

<!-- BEGIN 11_TEST_AND_CONFORMANCE_PLAN.md -->

# FRWD Test and Conformance Plan

## 1. Principle

FRWD should be testable independently of the reference editor.

## 2. Parser tests

Test:

- valid minimal file;
- missing doctype;
- missing FRWD version;
- missing document root;
- malformed manifest;
- duplicate document IDs;
- duplicate node IDs;
- invalid UTF-8 handling;
- unsupported major version.

## 3. Security fixtures

Create:

```text
script.frwd
onclick.frwd
remote-script.frwd
remote-image.frwd
remote-font.frwd
javascript-link.frwd
svg-script.frwd
meta-refresh.frwd
unsafe-iframe.frwd
huge-data-url.frwd
duplicate-id.frwd
malicious-css-url.frwd
```

Each has explicit expected diagnostics.

## 4. Round-trip tests

For every reference fixture:

```text
open -> parse -> editor model -> serialize -> save -> reopen
```

Assert:

- same document ID;
- stable node IDs retained;
- same visible content absent intentional normalization;
- document CSS preserved;
- asset hashes preserved when untouched;
- semantic order preserved;
- no editor chrome serialized.

## 5. Flow tests

Automated/browser tests should programmatically:

- insert long paragraph;
- delete paragraph;
- add list items;
- enlarge caption;
- replace short heading with long heading.

Assert:

- no block overlap;
- content remains inside intended container;
- following flow moves naturally;
- mobile viewport remains readable.

## 6. Layout tests

Test:

- main/sidebar layout;
- two-column region;
- wide figure;
- responsive stack;
- full-width table handling;
- long words/URLs;
- RTL later if not MVP.

## 7. Rich media tests

Video:

- poster visible;
- metadata loads;
- user playback;
- save/reopen;
- print fallback.

Chart:

- static fallback with JS disabled;
- hydrated view with JS;
- print static state.

## 8. Browser matrix

Automated desktop:

- Chromium;
- Firefox;
- WebKit.

Manual release check:

- Android Chromium;
- iOS Safari.

Pin actual tested versions in each release.

## 9. Offline test

Block network access.

Open `.frwd.html`.

Assert:

- no required remote request;
- content renders;
- assets render;
- video works;
- chart works if runtime included;
- Edit mode works;
- Save As works;
- print preview works.

## 10. JavaScript-disabled test

Publication still exposes substantive information.

## 11. AI operation tests

### Targeted replace
One paragraph changes; unrelated IDs/content stay unchanged.

### Move figure
Figure moves, retains ID/media.

### Atomic rejection
One bad operation causes full transaction rejection.

### Stale revision
Operation fails cleanly.

### Content lock
Attempted text change rejected.

### Style lock
Attempted CSS change rejected.

### Design-only
Theme/layout changes while text hashes remain identical.

## 12. Accessibility

Check:

- heading hierarchy;
- landmark structure;
- alt text;
- table headers;
- focus;
- keyboard rich-component operation;
- captions/transcripts warnings;
- color/contrast warnings where tooling supports.

## 13. Print regression

Reference fixtures render to PDF in automated Chromium plus manual Safari/Firefox review.

Check:

- page breaks;
- missing content;
- clipped tables;
- figure/caption separation;
- video fallback;
- unwanted editor UI;
- sensible typography.

## 14. Visual regression

Screenshots may be used for visual regression, but screenshots are never the canonical content representation.

Test viewports:

- desktop wide;
- desktop document;
- tablet;
- mobile;
- print page.

## 15. Conformance levels

Proposed:

### FRWD Core Reader
Can safely parse/render normal flow content.

### FRWD Editor
Can preserve/edit/save Core without destructive loss.

### FRWD Rich Reader
Supports required rich components.

### FRWD Publisher
Produces conforming standalone `.frwd.html`.

A product may implement a subset only if clearly declared.

<!-- END 11_TEST_AND_CONFORMANCE_PLAN.md -->


---

<!-- BEGIN 12_PRIOR_ART_AND_POSITIONING.md -->

# FRWD Prior Art and Positioning

**Status:** Product/technical comparison, not legal or patent analysis.  
**Checked:** 2026-08-09.

## 1. Do not claim "first AI-native document format"

That space is already active.

FRWD should make a narrower and more defensible claim.

## 2. Bento

Bento currently demonstrates a powerful adjacent idea:

- one self-contained HTML file;
- viewer/editor/presenter in the file;
- browser opening;
- local-first operation;
- assets carried with the document;
- AI-friendly editing.

Its current primary product is a presentation/PowerPoint alternative, and its repository describes broader office-document ambitions.

**What FRWD learns from Bento:**

The one-file HTML + embedded runtime architecture is viable and compelling.

**Where FRWD is intentionally centered differently:**

FRWD's defining model is **general flowing text documents**, not slide/canvas composition.

The core technical problems are therefore:

- paragraph editing;
- semantic document flow;
- sections;
- reflow;
- sidebars containing flow;
- figures;
- tables;
- citations/equations;
- pagination/print;
- responsive flowing layouts.

Reference:
https://github.com/nyblnet/bento

## 3. Lean Document Format (LDF)

LDF publicly describes itself as a compact, AI-native, web-native document format for editable, semantic, portable documents.

This is direct category overlap.

FRWD should not differentiate itself merely as:

- editable;
- semantic;
- AI-native;
- web-native.

**FRWD differentiation should instead be demonstrated through the complete experience:**

- canonical browser-renderable semantic HTML;
- strong flowing word-processing interaction;
- high-end CSS design as a first-class objective;
- self-contained native rich media including video;
- document-native responsive layouts;
- safe declarative interactivity;
- standalone browser publication that can include its editor;
- design/content locking for AI operations.

Reference:
https://leandocumentformat.org/

A fresh technical comparison against the current LDF specification/source should be performed before FRWD public launch.

## 4. DocLang

DocLang is an LF AI & Data initiative for an open AI-native document representation.

Its focus is machine-readable representation optimized for AI, including semantic/geometric/reading-order information.

FRWD should not compete by claiming to be a universal ingestion/interchange representation for every legacy document.

FRWD is primarily an **authored human document format and editing experience** whose representation is also excellent for AI.

These are related but different optimization centers.

References:
https://doclang.ai/
https://www.linuxfoundation.org/press/lf-ai-data-foundation-launches-doclang-specification-working-group-to-advance-an-open-standard-for-ai-native-documents

## 5. HTML

HTML already provides:

- semantic document elements;
- media;
- tables;
- accessibility;
- responsive layout through CSS;
- custom elements;
- browser rendering.

FRWD's innovation should not be described as inventing these capabilities.

FRWD standardizes them into a **durable flowing document lifecycle**:

```text
create
edit
save
AI edit
embed
publish
open offline
edit again
print
```

## 6. DOCX / ODF

Strengths:

- mature word processing;
- page/print workflows;
- review tools;
- widespread adoption.

FRWD advantage hypothesis:

- HTML/CSS-quality design;
- browser-native responsive output;
- media/interactivity;
- much cleaner AI representation;
- no office suite required for publication.

FRWD should eventually interoperate rather than pretend legacy formats will vanish.

## 7. PDF

PDF excels at:

- frozen appearance;
- print;
- archival exchange.

FRWD is not a better PDF renderer.

FRWD source remains:

- flowing;
- editable;
- semantic;
- responsive;
- rich.

PDF remains a natural export target.

## 8. EPUB

EPUB is important prior art for web technologies in document publishing.

FRWD differs in product center:

- live general-purpose editing;
- richer authoring lifecycle;
- AI operations;
- self-contained single HTML source/publication concept;
- office-document-like use cases.

Do not claim that packaged/portable HTML documents are new.

## 9. FRWD's strongest positioning

Use:

> **FRWD is a flowing rich web document: word-processing behavior with web-native design, media and AI editing.**

Or:

> **FRWD makes HTML-quality documents edit like documents rather than web pages.**

Or:

> **FRWD is a general-purpose flowing document format built on the web platform for humans and AI to edit together.**

## 10. Avoid these claims

Avoid:

> First AI-native document format.

Avoid:

> First self-contained HTML document.

Avoid:

> First editable HTML file.

Avoid:

> PDF for AI.

Avoid:

> Replaces every office format.

## 11. What must be proven, not merely claimed

The project becomes compelling only if the reference implementation visibly proves:

1. AI makes significantly better-looking FRWD than DOCX.
2. Normal users can edit it without understanding HTML.
3. Flow remains robust after substantial edits.
4. Rich media is easier than in traditional documents.
5. AI edits are more targeted/reliable than file regeneration.
6. Browser distribution is genuinely frictionless.
7. Print output remains good.

That demonstration is more valuable than broad novelty language.

<!-- END 12_PRIOR_ART_AND_POSITIONING.md -->


---

<!-- BEGIN 13_EXAMPLE_DOCUMENTS.md -->

# FRWD Reference Document Scenarios

These examples exist to test the format. They are not separate products.

## 1. Profile / CV

### Why it is a useful test

A CV stresses:

- typography;
- dense information;
- sidebars;
- two-column layout;
- strict page count;
- print quality;
- mobile reflow;
- human text editing.

FRWD can additionally test rich media:

```text
Name
Role

[portrait / optional 20-second introduction video]

Experience                         Skills
--------------------------------  ----------------
...
```

Digital:
- video plays.

Print:
- poster image + optional video reference.

Mobile:
- sidebar stacks into reading flow.

The editor remains generic; it has no special "CV generator" architecture.

## 2. Scientific report

Tests:

- semantic sections;
- abstract;
- equations;
- figure/caption;
- table;
- references;
- supplementary video;
- print.

Possible AI command:

> Shorten the discussion by 20%, do not alter any reported numbers, and move Figure 3 after its first citation.

## 3. Business report

Tests:

- visual design;
- KPI cards;
- responsive grid;
- chart;
- tables;
- sidebars;
- print executive summary.

Possible AI command:

> Preserve all content but redesign this in a restrained institutional style.

## 4. Rich technical manual

Tests:

- instructions;
- callouts;
- images;
- inline demonstration video;
- disclosures;
- print fallbacks.

Digital:

```text
Step 4 — Replace the seal

[▶ 18-second demonstration]

[Important]
Do not...
```

Print:

```text
Step 4 — Replace the seal

[poster frame]
Demonstration video: reference/link

Important: Do not...
```

## 5. Proposal

Tests:

- cover;
- narrative;
- milestones;
- tables;
- rich project demo;
- designed pages;
- print.

## 6. Academic/technical application

Tests:

- flowing prose;
- fixed page target;
- bibliography;
- supporting media hidden/reduced in print;
- strong design without layout fragility.

## 7. Stress-test document

Create a deliberately difficult fixture with:

- very long headings;
- 10,000+ words;
- multiple tables;
- many figures;
- embedded short video;
- sidebar;
- nested lists;
- long URLs;
- footnotes later.

Use it to expose weak reflow/serialization assumptions.

## 8. AI generation benchmark

For the same content prompt, generate:

- DOCX;
- plain HTML;
- FRWD.

Human evaluation should compare:

- visual quality;
- editability;
- reflow after editing;
- mobile behavior;
- rich media;
- AI revision reliability;
- print quality.

This provides evidence for FRWD's actual value proposition.

<!-- END 13_EXAMPLE_DOCUMENTS.md -->


---

<!-- BEGIN 14_FUTURE_ROADMAP.md -->

# FRWD Future Roadmap

## 1. v0.1

Prove:

- core semantic format;
- flowing editor;
- theme/CSS system;
- images;
- video;
- tables;
- simple chart;
- standalone browser publication;
- AI operations;
- print.

## 2. v0.2 candidates

- comments;
- tracked suggestions;
- semantic citations;
- footnotes/endnotes;
- richer chart grammar;
- templates;
- more robust CSS inspector;
- accessibility report;
- Markdown import/export;
- basic HTML import.

## 3. v0.3 candidates

- DOCX import prototype;
- DOCX export prototype;
- bibliography formats;
- change review;
- linked/reference asset mode for huge working documents;
- richer tables;
- document variables.

## 4. v0.5 candidates

- optional 3D component;
- digital signatures design;
- encrypted document research;
- collaboration protocol based on FRWD operations;
- EPUB export;
- improved print/paged-media engine if browser CSS is insufficient.

## 5. v1.0 bar

Do not call FRWD 1.0 until:

- final name/extension cleared;
- format spec stable;
- conformance suite public;
- migrations proven;
- security reviewed;
- browser publication proven;
- more than one real document genre is in sustained use;
- at least one implementation path independent of the reference editor is credible;
- no editor-specific JSON leaks into the format;
- round-trip stability is strong.

## 6. Possible standards relationship

FRWD should remain open to interoperability with:

- DocLang for AI/document exchange;
- HTML standards;
- MathML;
- EPUB;
- DOCX/ODF import/export;
- established citation formats.

Do not create new sub-standards when an established representation can be mapped cleanly.

## 7. Collaboration

FRWD Ops creates a natural future sync model:

```text
base revision
+ semantic operations
+ actor
+ timestamp
```

A cloud collaboration server could exchange operations without changing the file model.

Collaboration remains optional.

## 8. Large media

The one-file principle is powerful but video can create very large files.

Future profile options to investigate:

- portable self-contained `.frwd`;
- working/project `.frwd` with explicitly linked local assets;
- "publish portable" command that embeds dependencies.

Do not add this complexity until real usage proves it necessary.

## 9. Editing runtime evolution

A self-editing `.frwd.html` may embed a runtime version.

Future editor can upgrade it.

Old files keep functioning because the runtime travels with them.

## 10. Naming

FRWD is the working identity.

Before public launch perform:

- trademark search;
- extension collision search;
- package registry search;
- domain/searchability review;
- media-type/IANA strategy;
- open-source project name check.

Do not freeze public branding before this is complete.

<!-- END 14_FUTURE_ROADMAP.md -->
