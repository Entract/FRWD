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

**Settled by [ADR 0001](adr/0001-frwd-dom-is-authoritative.md):** the validated FRWD DOM is the authoritative in-memory document. A structured editing engine is used for rich text within one block at a time, and its model is transient. It does not own the document.

A spike measured what a whole-document editor model costs: opening the three designed reference documents in ProseMirror with a generous schema and serializing straight back, with no edit, discarded every stable id (54, 51 and 34 respectively), every document class, every `data-*` attribute, and every semantic element except `<img>` - silently, with no error raised.

**Still a candidate, not a decision:**

- which engine edits a rich-text region - ProseMirror scoped to a block, a smaller library, or `contenteditable` with careful input handling, since the region schema is narrow;
- React, another UI framework, or none.

Both are now small, reversible choices rather than architectural ones, which is what deferring them bought.

The saved format MUST NOT depend on any editor library's JSON schema. That is what makes the choice reversible, and it is the reason deferring it costs nothing.

## 3. What the structured engine is for

Raw `contenteditable` alone is unreliable for caret behaviour, selection, inline marks, paste normalisation and input-method handling. Those are the problems a structured engine solves well, and they are all *inside* a block.

So the engine handles rich text within one block: paragraph, heading, caption, list-item and cell content.

Everything else is FRWD's own machinery, per ADR 0001:

| | Owned by |
|---|---|
| Caret, selection, inline marks, typing, paste inside a block | Structured engine, transient region model |
| Block creation, deletion, movement, replacement | FRWD Ops on the FRWD DOM |
| Attributes, classes, theme tokens | FRWD Ops |
| Tables, figures, MathML, SVG, media, custom elements | FRWD DOM objects, addressed by stable id |
| Serialization | `@frwd/format` |
| Undo | One editor stack holding both kinds of entry |

This is a smaller job for the engine than the conventional architecture gives it, and deliberately so: it keeps the engine's schema to inline content plus opaque atoms, which is a set that does not grow every time FRWD gains an element.

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
