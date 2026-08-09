---
category: feature
---

# 0001. The FRWD DOM is authoritative; the editing engine owns rich text only

**Status:** accepted

**Date:** 2026-08-09

**Task:** t-024

## Context

The reference editor needs a structured editing engine. The conventional answer is ProseMirror, or Tiptap on top of it, owning the whole document: parse the file into the engine's model, edit there, serialize back.

That answer deserved checking rather than assuming, because FRWD's canonical model is **semantic HTML**, and ProseMirror's is deliberately not. ProseMirror uses a schema-constrained representation by design — that constraint is where its correctness guarantees come from. Tiptap's own documentation warns that it is not an arbitrary HTML editor and that HTML which does not conform to its schema can be lost.

FRWD makes that distinction concrete rather than theoretical. A conforming document may contain arbitrary semantic section structure, stable `data-frwd-id` identity, MathML in both inline and display forms, SVG, tables, `frwd-*` custom elements, inert dataset and manifest blocks, document-defined classes and attributes, and embedded media.

The question this ADR answers:

> Does the structured editing engine own the whole FRWD document model, or does it edit rich-text regions while the canonical FRWD DOM remains authoritative?

## The spike

Three designed reference documents — the business report, the rich manual and the scientific paper — were opened in a browser, parsed into a ProseMirror document with a **generous** schema (`prosemirror-schema-basic` plus lists, what a real editor starts from), and serialized straight back **with no edit at all**.

ProseMirror stands in for the whole class here. Tiptap wraps it, and every schema-constrained engine makes the same trade.

The spike lives at `spikes/structured-editor/` and runs as `tests/browser/editor-architecture.spike.spec.ts`, so the answer stays checkable rather than becoming folklore.

### Result

| | business report | rich manual | scientific paper |
|---|---|---|---|
| Stable ids | **54 → 0** | **51 → 0** | **34 → 0** |
| Document classes | 15 → 0 | 10 → 0 | 8 → 0 |
| `data-*` attributes | 11 → 0 | 9 → 0 | 1 → 0 |
| Visible text | changed | changed | changed |

Every semantic element the documents are built from was discarded: `section`, `article`, `header`, `aside`, `figure`, `figcaption`, `table` with `thead`/`tbody`/`caption`/`th`, `dl`/`dt`/`dd`, `svg`, `math` with `mfrac` and `msup`, `video`, `audio`, `source`, and every `frwd-*` element. Of the interesting elements across all three documents, exactly one survived: `<img>`.

**And it threw nothing.** `error: null` in all three runs. A whole-document editor model would not fail loudly on a FRWD it does not understand; it would open it, look plausible, and quietly hand back a different document. Text length changed too — captions and table cells vanished with their containers — so even "the words are still there" is not true.

### What the spike does and does not prove

It does **not** prove ProseMirror is incapable. A real integration would declare custom node types for figures, tables, MathML, each `frwd-*` element, and so on, and much of the above would then survive.

It proves something more useful about the shape of the commitment. Under approach A, **FRWD's extensibility becomes bounded by the editor's schema**: anything the schema has not been taught is deleted, silently, on open. Every new FRWD element, every document-defined attribute, every unknown-but-valid construct that spec §17 says readers SHOULD preserve, becomes a change to the editor's schema — and until it is made, documents lose data without complaint.

That inverts the dependency the format exists to avoid. Invariant 12 says the format must not depend on one editor library; a schema that must enumerate everything FRWD can express *is* that dependency, wearing a different hat.

## Decision

**Approach B.** The validated FRWD DOM is the authoritative in-memory document. There is exactly one durable document model, and it is the semantic HTML the file contains.

A structured editing engine is used where it is genuinely strongest — ordinary rich text: paragraph, heading, caption, list-item and cell content — scoped to **one block at a time**, and its model is transient.

### How the two kinds of transaction meet

The engine's model is created when a block takes focus and discarded when the block is committed. It never spans blocks, never holds the document, and is never serialized to a file.

```text
FRWD DOM  (authoritative, always)
   │
   ├── structural change ──→ FRWD Ops: staged, validated, atomic
   │                          (insert, delete, move, replace, attributes,
   │                           theme tokens — human and AI alike)
   │
   └── inline text change ─→ transient region model, engine transactions
                             (typing, selection, inline marks, caret undo)
                                    │
                                    └─ on commit: inline children of that one
                                       block are replaced in the FRWD DOM
```

The block element itself is never replaced, only its inline children — so `data-frwd-id` never leaves the FRWD DOM and never has to be restored. Identity is preserved by construction rather than by bookkeeping, which is what `07_EDITOR_ARCHITECTURE.md` §5 now requires.

Because a region contains only inline content, the region schema is small and closed: text, `strong`, `em`, `code`, `a`, `sub`, `sup`, and semantic spans. Inline objects the engine has no business understanding — inline `math`, inline `svg`, an inline `frwd-*` element — enter it as **opaque atoms**: leaf nodes holding a reference to the original DOM node, serialized back byte-identical. The engine moves them around; it never looks inside.

This is the crux. Approach A requires the editor schema to cover everything FRWD can express. Approach B requires it to cover inline text plus one opaque-atom escape hatch. The first grows with the format forever; the second does not grow at all.

Undo is one stack with two kinds of entry — region transactions and FRWD Ops transactions. An AI edit is an Ops entry, so it is undoable exactly like a human one, satisfying §14.

Save serializes the FRWD DOM. No editor JSON is written, ever.

## Consequences

**Easier.** Identity, unknown elements, MathML, SVG, tables, custom elements and document-defined attributes all survive by default, because nothing ever converts them. A new `frwd-*` element needs no editor change to be preserved — only to be *edited* specially. Round-trip stability is inherited from `@frwd/format` rather than reimplemented. AI and human edits share one document and one undo stack.

**Harder.** We do not get a mature engine's block-level machinery for free: block selection, drag-and-drop, block-level undo grouping and paste normalisation across blocks have to be built on FRWD Ops. Cross-block selection — select from the middle of one paragraph into the next and type — needs explicit design, because two regions are involved. That is real work and this ADR does not pretend otherwise.

**Foreclosed.** Any future feature that assumes a single engine model spanning the document — the engine's own collaborative editing, for instance — is unavailable without revisiting this decision. Collaboration was already out of MVP scope, and FRWD's own operation envelope is a better foundation for it than an editor library's internals.

**Still open.** Which engine to use for regions is now a much smaller question, and deliberately not answered here: the region contract is inline content in, inline content out, with opaque atoms passed through. ProseMirror scoped to a region would do it; so would a smaller library; so, possibly, would `contenteditable` plus careful input handling for a schema this narrow. That choice can be made and remade without touching the format, which is the point.

## Verification

The spike remains in the browser suite. If someone later argues for approach A, the numbers are one command away rather than a matter of recollection.
