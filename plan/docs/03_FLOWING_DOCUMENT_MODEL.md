---
category: feature
---

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
