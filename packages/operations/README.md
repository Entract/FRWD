# @frwd/operations

Deterministic semantic edit operations over stable FRWD identifiers.

AI edits a FRWD through small, reviewable changes addressed by `data-frwd-id`,
never by regenerating the file. This package is that mechanism — and it is
deliberately ordinary code: no model, no network, no vendor.

Framework-agnostic. Depends on `@frwd/format` and `@frwd/sanitize`.

```ts
import { apply, preview } from "@frwd/operations";

const envelope = {
  protocol: "frwd-ops",
  version: "0.1",
  documentId: document.documentId,
  baseRevision: 0,
  constraints: { styleLocked: true },
  operations: [{ op: "replace_text", target: "p-42", text: "Shorter." }],
};

preview(document, envelope);  // changes nothing, shows what would happen
apply(document, envelope);    // changes nothing unless everything passes
```

## Transaction semantics

**Preview is strictly non-mutating**, including of the document passed in. The
staged document that comes back is a separate object: inspect it, diff it, show
it, throw it away.

**Operations apply to a staged copy**, never optimistically to the live tree
with a rollback afterwards. A rollback is only as good as the bookkeeping behind
it, and that bookkeeping is exactly what fails on the paths nobody tested. A
rejected transaction therefore changes nothing at all — by construction, not by
care.

**A failed transaction changes absolutely nothing.** One failing operation ends
the whole transaction; the live document is untouched. The result still carries
the staged document, so a caller can show the would-be output beside the reasons
it was refused.

**A successful transaction increments `revision` exactly once** and updates
`modified` exactly once, however many operations it contained. An absent
manifest `revision` reads as **0**, so a document that has never been edited
still has a well-defined base.

**The staged final state must pass both layers before commit** — structural
conformance from `@frwd/format` *and* the native safety profile from
`@frwd/sanitize`, with the bumped revision already in place.

**Unsafe generated content is rejected and reported, never silently sanitized.**
A caller who asked for one thing and quietly got another cannot review it.

**Inserted nodes end with valid, unique stable ids.** Missing ids are minted and
reported in the change record — a model that forgets an id on one paragraph
should not have its transaction rejected, because that pushes callers back
toward regenerating the document. A *duplicate* id is different: it is
ambiguous, cannot be resolved without guessing what the author meant, and is
refused before commit. So is any ambiguous target.

`data-frwd-id` cannot be changed by `set_attribute`. Identity is not an editable
attribute; it is what every other operation addresses.

## Operations

| | |
|---|---|
| `replace_text` | Replace the target's content with plain text. See below. |
| `replace_node` | Replace the target with parsed markup. |
| `insert_before` / `insert_after` | Place markup as a sibling. |
| `append_child` / `prepend_child` | Place markup inside the target. |
| `delete_node` | Remove the target. Not the document root. |
| `move_node` | Relocate a node, keeping its identity. Not inside itself. |
| `set_attribute` | Set or remove one attribute. |

Style and theme operations — `set_theme_token`, layout and figure variants,
stylesheet regions — are deliberately absent. They arrive in `t-016`, on top of
this transaction machinery rather than beside it.

### `replace_text` is deliberately blunt

It replaces the target's **complete child content** with one plain-text node. It
makes no attempt to preserve `<strong>`, links, citations or any other inline
markup: whatever was inside is gone. Identified blocks it destroys are listed in
the change record's `removedIds`, so the loss is visible rather than silent.

Text is inserted as text. `<b>` arrives as four characters, not an element.

Rich replacement is `replace_node`. Range-aware editing — changing part of a
paragraph while keeping the rest — is deferred.

### Fragment context matters

Markup is parsed in the context it will live in. `<li>` outside a list, or
`<td>` outside a row, is discarded by the HTML fragment parsing algorithm — so
children parse inside the target, siblings inside its parent.

## Constraints

`contentLocked` permits only presentational attribute changes (`class`,
`style`); everything else is refused. `styleLocked` is the mirror. Both are
checked before anything is staged.

Implemented in task `t-005`.
