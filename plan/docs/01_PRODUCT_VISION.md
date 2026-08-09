---
category: feature
---

# FRWD Product Vision

## 1. One-sentence definition

**FRWD is a flowing rich web document format and editor: Word-like editing, web-quality presentation, native multimedia, and semantic AI collaboration.**

## 2. Mental model

A useful shorthand is:

> **What would a general-purpose document look like if Word were invented after HTML, CSS, responsive design, video and AI?**

That is closer to FRWD than "PDF for AI."

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

FRWD 0.1 is not:

- PowerPoint;
- Figma;
- Canva;
- a website builder;
- a spreadsheet;
- a notebook execution environment;
- a CMS;
- a cloud collaboration suite;
- a macro platform;
- a perfect clone of Microsoft Word.

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
