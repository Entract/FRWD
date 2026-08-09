# @frwd/sanitize

The FRWD native safety profile. A native `.frwd` is **data, not software**: it
executes nothing and fetches nothing.

Framework-agnostic. Depends on `@frwd/format` and, for CSS, `postcss`.

```ts
import { FrwdDocument } from "@frwd/format";
import { checkNativeConformance, inspect, sanitize } from "@frwd/sanitize";

const document = FrwdDocument.parse(untrustedSource);

inspect(document.tree);            // reports violations; changes nothing
checkNativeConformance(document);  // structural + profile, composed
sanitize(document.tree);           // repairs, and reports every change
```

## Inspection and repair are separate

`inspect()` never modifies a document. An unsafe file is still a file: it parses
as inert data, and the honest response is to describe what is wrong with it, not
to quietly delete the sender's content. Opening a document is not consent to
have it rewritten.

`sanitize()` is the mutating half, invoked deliberately and separately. It
reports every edit it makes, with the stable id of the block the edit happened
in — a user told *what* was removed can judge whether they still trust the
sender; a user whose document changed silently cannot.

## Composed conformance

`checkNativeConformance()` answers the whole question. `@frwd/format` decides
whether a document is structurally valid; this package decides whether it stays
inside the safety profile. Neither is sufficient alone:

- a flawless document tree carrying an executable script is **not** a conforming
  native FRWD;
- a perfectly inert file with no manifest is **not** one either.

A caller asking "is this a conforming native FRWD?" should never have to know
the answer has two halves.

## What the profile forbids

| Code | |
|---|---|
| `executable-script` | Any `<script>` whose type is not inert FRWD data — including `text/plain`, because a profile that admits exceptions is one nobody can verify. |
| `script-content-escape` | Inert script content that could close its own element and split the document. |
| `event-handler-attribute` | `onclick` and every other `on*` attribute. |
| `forbidden-element` | `iframe`, `object`, `embed`, `applet`, `frame`, `frameset`, `base`. |
| `meta-refresh` | Navigation with no user action. |
| `unsafe-url-scheme` | `javascript:`, `vbscript:`, `blob:`, `filesystem:`. |
| `unsafe-data-url` | A data URL carrying HTML or JavaScript — self-contained, and still a program. |
| `external-resource` | Any auto-fetching attribute pointing outside the file, remote *or* relative. |
| `css-import` | `@import`: a remote stylesheet by another name. |
| `css-external-resource` | `url()` in CSS reaching outside the file — the quietest tracker there is. |
| `oversized-data-url` | Warning. An embedded asset above a configurable limit. |
| `svg-foreign-object` | Warning. HTML inside SVG, where sanitization is easy to get wrong. |
| `unknown-custom-element` | Warning. Preserved, but no reader can give it behavior. |
| `css-parse-error` | Warning. CSS that could not be parsed, and therefore could not be checked. |

An ordinary external hyperlink is **permitted**. Following it is a user action —
that is the whole distinction the profile is built on.

## Two design notes

**URLs are classified by what a browser does unprompted**, not by pattern
matching on their text. Browsers strip tab, newline and carriage return from
anywhere in a URL before parsing it, so `java`, newline, `script:` executes;
`classifyUrl` strips the same characters first. A prefix check would miss it.

**CSS is parsed, not scanned.** Detecting a remote reference by regular
expression is guessable and therefore evadable, and an evadable sanitizer is
worse than none because it is trusted.

Implemented in task `t-004`. Security fixtures live in `fixtures/security/`.
