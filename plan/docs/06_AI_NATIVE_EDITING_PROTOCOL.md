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

### Patch theme token

```json
{
  "op": "set_theme_token",
  "name": "--frwd-content-width",
  "value": "860px"
}
```

### Replace stylesheet region

Advanced AI/design operation, subject to CSS sanitization.

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

Useful safe tools:

```text
set_layout_variant(section_id, "main-sidebar")
set_figure_variant(figure_id, "wide")
set_document_theme(theme_patch)
set_print_target_pages(2)
```

These compile to controlled HTML/CSS changes.

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
