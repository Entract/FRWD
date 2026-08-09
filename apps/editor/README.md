# FRWD reference editor

The MVP slice from `t-010`, built on [ADR 0001](../../plan/docs/adr/0001-frwd-dom-is-authoritative.md).

```bash
pnpm --filter @frwd/editor dev
```

Open a `.frwd`, click a paragraph, type. Save, or publish a `.frwd.html`.

## The shape of it

**The canonical document is the parsed FRWD tree** held by `@frwd/format`. Everything else on screen is a projection of it, rebuilt whenever it changes:

```text
.frwd file
    ↓ parse + validate + inspect (never sanitize on open)
canonical FRWD tree ──────────────────── the document
    ↓ serializeElement                        ↑
screen projection (thrown away and rebuilt)   │
    ↓ focus a block                           │
ProseMirror region (transient, one block)  ───┘ inline children only
```

Two transient models, one durable one. The screen projection and the region model are both discarded and rebuilt; neither is ever saved, and neither is ever the thing an operation acts on.

**Structural change goes through FRWD Ops** — insert, move, theme tokens — staged and validated by `@frwd/operations`, exactly as an agent's edits would. **Inline text change goes through the region**, and only that block's inline children are written back, so `data-frwd-id` never leaves the canonical tree.

## The region

The schema is five things: text, `strong`, `em`, `link`, `hard_break`, and an **opaque atom**.

The atom is the whole trick. Inline MathML, inline SVG, an unknown inline custom element — anything the region does not understand — is captured as its own source, carried through untouched, and written back byte-identical. It can be selected, deleted and moved; it is never looked inside. Unsupported valid content is uneditable-but-preserved, never normalised away.

Marks remember the **element** they came from, not just the role. `<b>` comes back as `<b>`, and an `<a data-frwd-id="…">` keeps its identity. A mark that only remembered "this text is bold" would silently rewrite the author's markup on every open — which the regression suite caught, and now prevents.

## What is chrome

Everything ProseMirror puts on a mounted block — `contenteditable`, its classes, spellcheck and ARIA plumbing — is editor chrome. The block's attributes are captured before the view exists and restored exactly afterwards, so a block that has been focused and blurred is indistinguishable from one that never was. There is a regression for that across two fixtures.

Selection outlines live on the projection, never on the canonical tree.

## Undo

The editor owns the durable history; ProseMirror's is local to the focused region and lasts as long as the region does. A whole region edit lands as **one** editor-level entry alongside FRWD Ops entries, so an AI edit and a paragraph rewrite undo the same way.

Undo currently stores whole-document snapshots. That is honest rather than clever — correct by construction, and cheap at the size FRWD documents run to. Inverse operations are the proper form and can replace it without touching a caller.

## Paste

Pasted HTML is imported content and crosses the same trust boundary as a file: it goes through the safety profile before it reaches the document. Unlike opening a file, repairing here is right — the user is asking to bring the content in, not to have it preserved as received.

## Read-only is a session property

A file that does not open as a conforming native FRWD is displayed, diagnosed and quarantined. Not partly: no region mounts, no text is editable, no formatting applies, no operation runs, and it cannot be saved over as though it were native. Opening a `.frwd.html` publication lands here, because a publication carries the runtime and a native FRWD carries no script.

The rule lives on `EditorSession`, not in the toolbar. A rule enforced only by the UI holds until someone calls the session from somewhere else.

Importing or converting such a file is a separate, deliberate act, and not one this slice performs.

## Tests

```bash
pnpm test:editor     # drives the real UI against a dev server
```

The region model has its own coverage in the `file://` browser suite; this one exists for the wiring between a person and that model, which is where manual use found bugs the model's tests could not see. It uses the actual toolbar buttons on purpose.

## Not in this slice

Cross-block selection, multi-block paste, Enter and Backspace across block boundaries, comments, collaboration, and the AI panel. `t-023` already defines the seam the AI panel plugs into.

No UI framework, deliberately: ADR 0001 makes the FRWD tree the document, and the surest way to honour that is for nothing to be reconciling it. A framework could own the toolbar and outline; at this size, not having one is simpler than drawing that line.
