---
category: feature
---

# 0002. Paper is an editor view; print preview belongs to the browser

**Status:** accepted

**Date:** 2026-08-10

**Task:** t-028

## Context

Three things had been blurring together in conversation about the editor:

1. **Screen view** — the document rendered with its own normal CSS. This is the canonical digital presentation, and responsive rules work as written.
2. **Paper visualisation** — an editor preference. Someone may want to see a white sheet on a grey desk while editing a document that flows and may never be printed.
3. **Print preview** — the actual result of `@media print`, `@page` and break rules.

The design pack's rule stands (`04_STYLE_LAYOUT_AND_PAGINATION.md`): normal editing is continuous flow, pages are a visualisation, and canonical content never gains hard page wrappers around ordinary paragraphs.

The question this ADR answers is narrower and practical: **can a page, using only what the web platform exposes to it, build a trustworthy paginated print preview?** If it can, the editor should. If it cannot, we should say so rather than shipping something that looks like a preview and lies.

## The spike

`tests/browser/pagination.spike.spec.ts`, run against the designed reference documents.

### What a page can see

`CSSOM` exposes `@page` rules where a document declares them, and their declaration blocks are readable. That is genuinely useful, and it is where "Print target: A4" can honestly come from.

What no API offers is **where the engine decided to break**. There is no fragment API, no page-box API, and nothing on `beforeprint` that reports page structure. A document cannot ask how many pages it will occupy, or where page two starts.

### What the naive approach costs

Dividing `scrollHeight` by a usable A4 height — the approach the brief warned about — measured against ground truth from the browser's own print engine:

| Document | Naive estimate | Real page count |
|---|---|---|
| Business report | 3 | **4** |
| Rich manual | 2 | **3** |

Wrong by a full page on both, and wrong in the direction that matters: it under-counts, so a preview built on it would show the last page's content as fitting when it does not.

That is before the cases that make it worse — `break-inside: avoid` on figures and tables, orphans and widows, print-only content appearing, and collapsed disclosures expanding.

### And the screen is not the document being printed

Measuring the screen canvas measures a different layout entirely. The business report is 2481px tall on screen and 2083px in print media, because its print rules restate the palette, collapse the grid to one column and expand hidden content.

### The asymmetry that decides it

Ground truth *was* obtainable — via `page.pdf()`, which is the automation protocol driving the browser from outside. That is precisely the point: **the information exists in the engine and is not exposed to the page.** An in-app preview cannot reach it.

## Decision

**No embedded paginated preview, and no pagination engine.**

- **Screen view** renders the document's own CSS. Editor viewport widths (mobile, tablet, desktop) change the *projection* only — the document reacts through its own responsive rules, and the canonical source is untouched.
- **Paper view** is editor chrome: a sheet, a shadow, a workspace around it. It is a reading and composition aid, honestly labelled as a **view**, and it does not claim to show pagination. It never rewrites the document into pages.
- **Print preview** delegates to the browser's real print engine, on the real publication produced by `@frwd/publisher` — not on the editor's screen DOM. The one honest preview available is the one the print engine itself produces.
- **`@page` is document state; paper view is an editor preference.** The editor may *read* `@page` and report what the document declares. Choosing A4 in the view switcher does not write `@page`, and never will through this control.

A document that declares its own fixed geometry — `.sheet { width: 210mm; min-height: 297mm; }` — is expressing document CSS, and the editor preserves it exactly. Paper chrome surrounds the document; it does not redefine it.

## Consequences

**Honest.** Nothing in the editor claims to know where pages break. A user who wants to see pages gets the browser's print path, which is correct by construction because it *is* the thing that will print.

**Limited.** There is no in-app page count, no "this will be 4 pages" indicator, no page thumbnails, and no fitting content to a page target. Those are real features and we do not have them.

**Deferred, with the boundary named.** A trustworthy in-app paginated preview requires a paged-media layer — a CSS Paged Media implementation such as Paged.js or Vivliostyle, which relays the document into page boxes itself. That is a substantial dependency that takes over layout, and adopting one is a decision to make when the need is concrete, not now. This ADR records where that boundary sits so the next person does not re-derive it.

**Product rule preserved.** A user may like looking at paper. That does not mean the document must be made of pages.

## Verification

The spike stays in the browser suite. If someone later proposes an embedded paginator, the numbers are one command away.
