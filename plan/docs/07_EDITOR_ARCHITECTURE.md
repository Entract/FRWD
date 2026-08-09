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

## 2. Technical stack

Settled, because the rest of the implementation already uses it:

- TypeScript;
- Vite;
- DOM/CSS-native rendering;
- Playwright tests.

**Candidates, not decisions:**

- React, or another UI framework, or none;
- a ProseMirror/Tiptap-class structured rich-text engine, or another structured editing layer.

The editing-layer and UI-framework choice was deliberately deferred so it could be made by an editor that has to work rather than by a document written before one existed. It belongs to the ADR that opens the editor work, and should be argued from what the format, operations and publisher packages actually turned out to need.

The saved format MUST NOT depend on any editor library's JSON schema. That is what makes the choice reversible, and it is the reason deferring it costs nothing.

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
Parse without executing it
      ↓
Structural validation
      ↓
Native safety inspection
      ↓
   ┌──┴──────────────────────────────┐
 safe                             unsafe
   ↓                                 ↓
Extract style/assets          diagnostics, and either
   ↓                          quarantine or read-only,
Map to transient editor model with explicit repair only
   ↓                          if the user asks for it
Render
```

**Inspection, not sanitization.** Opening a document must never silently mutate it. An unsafe file is still someone's file: the editor's job on open is to say what is wrong with it, not to quietly delete the parts it dislikes and present the result as though that were what arrived. Repair is a separate, explicit action the user takes, and it reports what it changed.

Never inject untrusted source into a live page before it has passed inspection.

## 5. Save pipeline

```text
Editor model  (stable ids carried throughout)
      ↓
Serialize semantic HTML
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

**Stable ids are preserved throughout editing, not restored on save.** Identity must never leave the transient editor model and be reconstructed afterwards: reconstruction is guesswork, and an id that is guessed is not stable. New ids are minted only for newly created independently editable objects.

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

Whatever the surface, the editor's AI writes through the same path as any other agent: inspection, an operation envelope, a prepared transaction, review, commit. It does not reach into the live DOM and it does not regenerate the file. See section 1a of the AI-native editing protocol — that boundary is what lets the editor gain built-in AI without becoming dependent on a particular model, and lets an external agent get exactly the same semantics.

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
