---
category: feature
---

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
