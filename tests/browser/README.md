# Browser conformance

Playwright suites that open published `.frwd.html` files from `file://` — no
server, no network — in Chromium, Firefox and WebKit.

Naming: a spec named `*.nojs.spec.ts` runs only in the `chromium-no-js` project,
with JavaScript disabled, and asserts that the publication is still readable.
All other specs run in the three JavaScript-enabled browser projects.

These run from the moment the publisher exists, not after the editor —
cross-browser behaviour is a format guarantee.

Empty until task `t-007`.
