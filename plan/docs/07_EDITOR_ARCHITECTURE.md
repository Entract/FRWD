---
category: feature
---

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
