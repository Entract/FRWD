---
category: feature
---

# FRWD AI-Native Editing Protocol

## 1. Objective

AI should modify a FRWD through small, semantic, reviewable changes.

Routine editing MUST NOT require whole-document regeneration.

## 2. Stable identity

Every independently editable object has `data-frwd-id`.

Example:

```html
<p data-frwd-id="8b0a...">
  This is the current paragraph.
</p>
```

AI addresses `8b0a...`, not "the third paragraph on page 2."

## 3. Revision identity

The manifest SHOULD maintain:

```json
{
  "revision": 42
}
```

Every committed semantic transaction increments revision.

AI operations include a `baseRevision`.

Stale operations must be rejected or explicitly rebased.

## 4. Operation envelope

```json
{
  "protocol": "frwd-ops",
  "version": "0.1",
  "documentId": "document-uuid",
  "baseRevision": 42,
  "constraints": {
    "contentLocked": false,
    "styleLocked": true
  },
  "operations": []
}
```

## 5a. Three layers, and why the distinction matters

The protocol below is easy to over-extend. Keeping these three apart is what stops FRWD from quietly becoming a design system.

### Core FRWD operations

A small, closed set of deterministic operations over the document model: replace text, replace a node, insert, delete, move, set an attribute, set a theme token. They are normative, they mean the same thing in every conforming implementation, and every one of them is expressible against any FRWD document without knowing anything about that document's design.

### Document-defined style classes and variants

`wide`, `main-sidebar`, `lead`, `safety` — these are classes a document or theme chooses. They are **not** FRWD concepts, and they do not become FRWD concepts merely because a reference fixture uses them. Two conforming FRWD documents may share no class names at all.

The mechanism for changing them already exists and needs no new vocabulary:

```json
{ "op": "set_attribute", "target": "figure-uuid", "name": "class", "value": "wide" }
```

Standardising an enumeration of variants at format level would freeze one design vocabulary into the format and make every document that disagreed with it non-idiomatic. FRWD provides safe mechanisms for changing document-owned design; it does not standardise the design vocabulary of individual documents.

### High-level agent and editor tools

Convenience sits here, above the protocol rather than inside it. A tool such as:

```text
set_figure_variant(figure_id, "wide")
```

is an editor or agent affordance. It inspects which variants the current document's stylesheet actually defines, decides what to do, and **compiles down to core operations** — in that example, a single `set_attribute`. It is free to be heuristic, model-driven and document-specific, because nothing downstream depends on it: the transaction that reaches the document is still made of core operations, and is still atomic, staged and validated.

The test for which layer something belongs to: *could two conforming implementations disagree about what it should do?* If yes, it is a tool, not an operation.

Deferred for the same reason: `set_print_target_pages` is an optimisation goal rather than a deterministic document operation — "make this fit two pages" has many valid answers and depends on the rendering engine — and arbitrary stylesheet-region replacement is a large hole in the safety story with no demonstrated need yet.

## 5. Core operations

### Replace text

```json
{
  "op": "replace_text",
  "target": "paragraph-uuid",
  "text": "Replacement paragraph text."
}
```

### Replace node

```json
{
  "op": "replace_node",
  "target": "node-uuid",
  "html": "<blockquote data-frwd-id=\"new-uuid\">...</blockquote>"
}
```

### Insert before / after

```json
{
  "op": "insert_after",
  "target": "paragraph-uuid",
  "html": "<p data-frwd-id=\"new-uuid\">New paragraph.</p>"
}
```

### Append/prepend child

Used for section contents or list items.

### Delete node

```json
{
  "op": "delete_node",
  "target": "node-uuid"
}
```

### Move node

```json
{
  "op": "move_node",
  "target": "figure-uuid",
  "destination": "paragraph-uuid",
  "position": "after"
}
```

### Set safe attribute

```json
{
  "op": "set_attribute",
  "target": "image-uuid",
  "name": "alt",
  "value": "..."
}
```

### Set variant/class

Use controlled semantic variants.

### Set theme token

Changes a CSS custom property in the document stylesheet. The one style operation in v0.1.

```json
{
  "op": "set_theme_token",
  "name": "--accent",
  "value": "#2458a6",
  "scope": "default"
}
```

`scope` is `default` or `dark`, and is explicit rather than inferred. Designed documents pair a light value with a `prefers-color-scheme: dark` counterpart under the same token name, so "set --accent" is not a question that can be answered by position; an operation that picked one would silently change the wrong half of a theme.

The stylesheet is edited through a CSS syntax tree, never by string replacement. Editing CSS with a regular expression is guessing, and a guess that lands inside a declaration produces a stylesheet nobody wrote.

Rules:

- the token name MUST be a custom property, beginning `--`;
- if more than one `:root` rule in the requested scope declares the token, the operation is REFUSED rather than resolved by source order;
- if the scope has several `:root` rules and none declares the token, it is REFUSED, because there is no non-arbitrary place to add it;
- if the scope has no `:root` rule at all, one is created, which for `dark` means creating the media query too;
- the resulting stylesheet MUST satisfy the native CSS safety profile, so a token value cannot smuggle in a remote reference;
- the operation is rejected under `styleLocked` and permitted under `contentLocked`, because it changes appearance and no content.

### Replace stylesheet region

Deferred. See section 5a.

### Add/replace asset

Bytes are handled by host tooling; AI refers to logical asset IDs.

## 6. Atomicity

A multi-operation transaction is atomic.

If operation 4 of 7 fails validation, none are committed.

## 7. Validation

Before apply:

1. document ID check;
2. base revision check;
3. target resolution;
4. HTML parse;
5. sanitizer;
6. structure validation;
7. duplicate-ID check;
8. asset check;
9. style constraint check;
10. transaction preview;
11. commit.

## 8. Content lock

For a design-only request:

```json
"constraints": {
  "contentLocked": true
}
```

The operation validator rejects changes to:

- textual content;
- semantic content order;
- media identity;
- captions;
- substantive attributes.

Style/layout changes remain allowed.

## 9. Style lock

For a content-only request:

```json
"constraints": {
  "styleLocked": true
}
```

The validator rejects:

- CSS changes;
- class/variant changes;
- layout changes.

## 10. AI tool interface

A model should usually receive tools such as:

```text
get_document_summary()
get_outline()
get_node(node_id)
get_children(node_id)
search_document(query)
get_style_summary()
get_theme_tokens()
get_media_metadata(node_id)
preview_operations(transaction)
apply_operations(transaction)
validate_document()
```

Do not send megabytes of embedded video/base64 to the model.

## 11. High-level layout tools

These are tools, not operations - the third layer of section 5a. They live in an editor or an agent, they may be heuristic and document-specific, and they compile down to core operations before anything reaches a document.

```text
set_layout_variant(section_id, variant)   -> set_attribute(section_id, "class", ...)
set_figure_variant(figure_id, variant)    -> set_attribute(figure_id, "class", ...)
set_document_theme(theme_patch)           -> one set_theme_token per token
```

The variant names are whatever the document's own stylesheet defines. A tool discovers them by reading that stylesheet; it does not consult a list in this specification, because there is deliberately no such list.

`set_print_target_pages` is deferred. Fitting a document to a page count is an optimisation goal with many valid answers, dependent on the rendering engine - which makes it a job for a tool that can measure and iterate, and a poor fit for a deterministic operation.

## 12. AI-created documents

For initial generation, whole-document creation is valid.

After creation, the system should switch to semantic incremental edits.

## 13. Human-readable diff

Primary review UI:

```text
Changed
  Introduction / paragraph 3
  63 words -> 47 words

Moved
  Figure 2
  from end of Results
  to after paragraph discussing tensile strength

Design
  Sidebar width 32% -> 26%
  Body line-height 1.55 -> 1.48

Unchanged
  All other content
```

Raw HTML diff is secondary.

## 14. Provenance

Optional revision history may record:

- timestamp;
- actor type (`human`, `ai`, `importer`, `system`);
- model/tool label;
- operations;
- user request summary.

This is audit metadata, not cryptographic proof.

## 15. Reversible edits

The editor should maintain undo/redo transactions.

AI changes should be one or more coherent undoable units.

## 16. Important design rule

The AI protocol is part of the FRWD ecosystem, but FRWD files must remain editable without AI.

AI is not required for format conformance.
