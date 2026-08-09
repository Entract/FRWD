# @frwd/publisher

```text
native .frwd  +  trusted runtime  =  .frwd.html
```

One physical file: the semantic document, its CSS, its embedded assets, and the
standard FRWD runtime. No server, no CDN, no network. Someone who has never
heard of FRWD opens it in a browser and reads it.

```ts
import { inspectPublication, publish } from "@frwd/publisher";

const result = publish(document);
result.html;             // the .frwd.html
result.runtimeVersion;   // recorded in the file itself

inspectPublication(html); // what does this file actually contain?
```

## Publishing does not launder a document's own script

A native `.frwd` that carries executable content is **refused**, not published
with it. "It is HTML now" is not a reason for a recipient to run code the sender
wrote — the native profile and the publication profile are different things, and
the only script the publisher adds is the runtime.

So the source document must be a conforming native FRWD on both counts —
structurally valid *and* inside the safety profile — before anything is emitted.

The publisher never flattens text to canvas, rasterizes the document, replaces
semantics with coordinates, or reaches for a CDN. What comes out is the same
semantic document, still recoverable by generic tooling decades from now, with
one standard script alongside it.

## What it adds

| | |
|---|---|
| `<meta name="frwd-runtime-version">` | So an old file says which runtime travels with it. |
| `<meta name="frwd-publication-profile">` | `read` in 0.1. |
| `<style id="frwd-runtime-style">` | Tiny, and scoped to states the runtime itself sets. |
| `<script id="frwd-runtime">` | The trusted runtime, as readable source. |

The script is **classic, not a module**. Module scripts are fetched with CORS
and a `file://` origin is opaque, so a module runtime would fail to run in the
one place a publication most needs to work: a file someone was emailed.

## `inspectPublication`

A publication is ordinary HTML, and anyone can edit ordinary HTML. Nothing about
the file name makes it safe, and this does not pretend otherwise. It answers one
narrow, checkable question: **does this file contain the standard FRWD runtime
and nothing else that executes?**

"Yes" means the script is byte-for-byte the runtime this implementation ships,
and the rest of the file still satisfies the native safety profile — every rule
about event handlers, remote resources and forbidden elements applies after
publishing exactly as before. "No" names what is extra.

Treat an unknown `.html` with the caution due to any web content either way.

Implemented in task `t-006`. Cross-browser behaviour lands with `t-007`.
