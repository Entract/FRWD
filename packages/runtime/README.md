# @frwd/runtime

The trusted FRWD browser runtime — the only script a `.frwd.html` publication
carries.

Documents never contain arbitrary JavaScript. This code is standard, identical
across publications, and travels inside the file, so a document opened in twenty
years never needs a server to fetch its runtime.

## Constraints

**No dependencies, no framework, no network.** The runtime touches `document`
and `window` and nothing else. There is no code path that can fetch, so a
publication cannot phone home however it is opened. A test asserts the shipped
source contains no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or
dynamic `import`.

**The document already works.** Every publication is readable with JavaScript
disabled. The runtime only adds behaviour on top of markup that already says the
right thing — it never supplies content.

**It ships as source.** `RUNTIME_SOURCE` is the install function's own text via
`Function.prototype.toString()`, so what a publication embeds is exactly the code
that was reviewed and tested, not a bundler's rendering of it. Readable and
unminified by intent: a document you were sent should be one you can read, script
included.

That also means `installFrwdRuntime` must stay entirely self-contained — a
reference to anything outside its own body would reach a browser as an undefined
identifier. The "no dependencies" rule is structural rather than aspirational.

## What it does in 0.1

- **Hydration infrastructure.** Walks `frwd-*` elements and marks each with
  `data-frwd-hydrated`, so CSS and tests can tell hydrated from unhydrated
  without guessing. `frwd-disclosure` is the reference interactive component;
  the rest are marked `static`, because their fallback content *is* the
  component until a later runtime has something better. Unknown `frwd-*`
  elements are preserved and left alone, per spec §17.
- **Print.** Expands `<details>` and collapsed disclosures before printing and
  restores them after. A reader holding a printout cannot click anything, and a
  component that silently vanishes from print is exactly what the rich-media
  contract forbids.
- **State marker.** Sets `data-frwd-runtime="active"` on `<html>` once installed.

**Editing is deliberately absent.** Edit mode, undo and Save As belong with the
reference editor, and it would be premature to compile an editor into every
publication before we know what the editor is.

Behaviour is verified in real browsers by the cross-browser suite, not here —
these are the semantics; Chromium, Firefox and WebKit are the proof.
