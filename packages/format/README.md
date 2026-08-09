# @frwd/format

Reads and writes a `.frwd` document: semantic HTML parsing, stable
`data-frwd-id` object identity, manifest metadata, document CSS, embedded asset
metadata, and deterministic serialization.

Framework-agnostic. No editor, UI or AI-vendor dependencies. One runtime
dependency, [parse5](https://github.com/inikulin/parse5), for spec-compliant
HTML5 parsing.

```ts
import { FrwdDocument } from "@frwd/format";

const document = FrwdDocument.parse(source);

document.validate();     // structural problems with the tree as it stands
document.diagnostics;    // same, as a getter
document.isConforming;   // false if any diagnostic is an error
document.manifest;       // required + recommended metadata
document.css;            // <style id="frwd-document-style">
document.assets;         // asset metadata blocks
document.identified;     // Map<id, Element> in document order

document.getElementById("11111111-…");
document.ensureIds();    // assign ids to blocks that lack them
document.touch();        // update manifest.modified

document.toHtml();       // back to .frwd source
```

## The contract

**Semantic round-trip stability.** A no-op open/save preserves document
identity, every stable id, semantic structure, content, CSS, metadata and
embedded assets.

**Deterministic serialization.** The same tree produces the same bytes, every
time. Parsing normalizes a document once; every save after that is byte
identical.

## Reference canonical serialization

The byte layout this package emits is **reference canonical serialization** —
a property of this implementation, not a conformance rule (spec §21).

- *Attributes are sorted* — `data-frwd-id` first, then alphabetically. HTML
  treats attribute order as meaningless; diffs do not.
- *Markup is never reindented.* Whitespace in flow content is significant, so
  pretty-printing would change how the document renders. Text comes out exactly
  as it went in.
- *Output ends where the document ends*, with no trailing newline, because text
  after `</html>` is parsed into `<body>` and a cosmetic newline would grow the
  document on every save.

None of that is required of other FRWD writers. A document that satisfies the
semantic spec conforms whether or not its bytes match ours, and this package
reads it either way. These rules exist so a no-op save produces no diff, so
documents diff meaningfully in version control, and so fixtures can be stored as
exact expected bytes — and they may change without changing what conforms.

## Design notes

**The HTML tree is the document.** There is no second model that could drift
from the file (spec §4). Everything this package returns points into the same
nodes, and `toHtml()` serializes exactly what is there.

**Parsing never throws.** HTML5 parsing is error-tolerant by design, and a
document that breaks the FRWD profile is still worth opening and reporting on —
refusing to read it would strand the user's content. Problems come back as
`diagnostics` with stable codes.

**Reading never mutates.** `ensureIds()` is explicit, because a reader that
quietly rewrites what it opened cannot promise a stable round-trip. Pass an id
factory to make assignment reproducible.

**Validation reflects the tree, not the parse.** `validate()` runs over the
document as it stands on every call. The tree is mutable, and a verdict cached
at parse time would keep reporting problems the caller has already fixed — a
document with missing ids stops being non-conforming the moment `ensureIds()`
runs. The pass is linear, which is cheap next to being wrong about conformance.

**Profile enforcement lives elsewhere.** The no-script native profile is
`@frwd/sanitize`'s rule to keep, so that one rule has one owner. `isConforming`
here means *structurally* conforming. The public answer to "is this a conforming
native FRWD?" composes both layers: a structurally perfect document carrying
executable script does not conform.

Implemented in task `t-002`. Conformance fixtures follow in `t-003`.
