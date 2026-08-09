---
category: feature
---

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
