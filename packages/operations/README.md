# @frwd/operations

Deterministic semantic edit operations over stable FRWD identifiers.

AI edits a FRWD through small, reviewable changes addressed by `data-frwd-id`,
never by regenerating the file. This package is that mechanism — and it is
deliberately ordinary code: no model, no network, no vendor.

Framework-agnostic. Depends on `@frwd/format` and `@frwd/sanitize`.

```ts
import { apply, commitPrepared, preview } from "@frwd/operations";

const envelope = {
  protocol: "frwd-ops",
  version: "0.1",
  documentId: document.documentId,
  baseRevision: 0,
  constraints: { styleLocked: true },
  operations: [{ op: "replace_text", target: "p-42", text: "Shorter." }],
};

const prepared = preview(document, envelope);   // changes nothing
// … show prepared.staged, prepared.changes, prepared.errors to a human …
commitPrepared(document, prepared);             // commits exactly that

apply(document, envelope);                      // prepare + commit, no review
```

## The reviewed result is the committed result

`preview` returns a **prepared transaction**: the finished document, metadata
included. The revision, the `modified` timestamp and any identifiers minted for
nodes that arrived without one are all settled during preparation.

`commitPrepared` never reruns the operations. Rerunning would mint different
identifiers and stamp a different time, so the document that committed would not
be the document anyone reviewed — and in an AI editing protocol, review is the
whole safeguard.

It refuses if the live document is no longer the one the transaction was
prepared from: a different document, a different revision, or **the same
revision with different content** — an editor writing straight to the tree does
not bump anything, so the revision check alone would miss it. Applying a
decision made about an old state to a new one is worse than refusing, because
nobody would find out.

`apply` is the convenience path for callers that do not need to review: it
prepares and immediately commits, through the same code.

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
| `set_theme_token` | Set a CSS custom property in the document stylesheet. |

### `set_theme_token`, and what is deliberately not here

```json
{ "op": "set_theme_token", "name": "--accent", "value": "#2458a6", "scope": "default" }
```

`scope` is `default` or `dark`, and is explicit. Designed documents pair a light
value with a `prefers-color-scheme: dark` counterpart under the same token name,
so an operation that picked one by position would silently change the wrong half
of a theme.

The stylesheet is edited through a CSS syntax tree, never string replacement,
and the result must still clear the CSS safety profile — a token value cannot
smuggle a remote reference into the document. Ambiguity is refused rather than
resolved: two `:root` rules in one scope declaring the same token means source
order decides the winner, and guessing which was meant is not this package's job.

It is the **only** style operation, on purpose. FRWD provides safe mechanisms for
changing document-owned design; it does not standardise the design vocabulary of
individual documents. `wide` and `main-sidebar` are classes our fixtures happen
to define, not format concepts, and `set_attribute` on `class` already reaches
them. A high-level `set_figure_variant()` belongs in an editor that can read
which variants a given document actually defines, and compiles to
`set_attribute`.

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

Implemented in task `t-005`; `set_theme_token` in `t-016`.
