---
category: feature
---

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
