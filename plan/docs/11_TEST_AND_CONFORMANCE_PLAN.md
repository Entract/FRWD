---
category: feature
---

# FRWD Test and Conformance Plan

## 1. Principle

FRWD should be testable independently of the reference editor.

## 2. Parser tests

Test:

- valid minimal file;
- missing doctype;
- missing FRWD version;
- missing document root;
- malformed manifest;
- duplicate document IDs;
- duplicate node IDs;
- invalid UTF-8 handling;
- unsupported major version.

## 3. Security fixtures

Create:

```text
script.frwd
onclick.frwd
remote-script.frwd
remote-image.frwd
remote-font.frwd
javascript-link.frwd
svg-script.frwd
meta-refresh.frwd
unsafe-iframe.frwd
huge-data-url.frwd
duplicate-id.frwd
malicious-css-url.frwd
```

Each has explicit expected diagnostics.

## 4. Round-trip tests

For every reference fixture:

```text
open -> parse -> editor model -> serialize -> save -> reopen
```

Assert:

- same document ID;
- stable node IDs retained;
- same visible content absent intentional normalization;
- document CSS preserved;
- asset hashes preserved when untouched;
- semantic order preserved;
- no editor chrome serialized.

## 5. Flow tests

Automated/browser tests should programmatically:

- insert long paragraph;
- delete paragraph;
- add list items;
- enlarge caption;
- replace short heading with long heading.

Assert:

- no block overlap;
- content remains inside intended container;
- following flow moves naturally;
- mobile viewport remains readable.

## 6. Layout tests

Test:

- main/sidebar layout;
- two-column region;
- wide figure;
- responsive stack;
- full-width table handling;
- long words/URLs;
- RTL later if not MVP.

## 7. Rich media tests

Video:

- poster visible;
- metadata loads;
- user playback;
- save/reopen;
- print fallback.

Chart:

- static fallback with JS disabled;
- hydrated view with JS;
- print static state.

## 8. Browser matrix

Automated desktop:

- Chromium;
- Firefox;
- WebKit.

Manual release check:

- Android Chromium;
- iOS Safari.

Pin actual tested versions in each release.

## 9. Offline test

Block network access.

Open `.frwd.html`.

Assert:

- no required remote request;
- content renders;
- assets render;
- video works;
- chart works if runtime included;
- Edit mode works;
- Save As works;
- print preview works.

## 10. JavaScript-disabled test

Publication still exposes substantive information.

## 11. AI operation tests

### Targeted replace
One paragraph changes; unrelated IDs/content stay unchanged.

### Move figure
Figure moves, retains ID/media.

### Atomic rejection
One bad operation causes full transaction rejection.

### Stale revision
Operation fails cleanly.

### Content lock
Attempted text change rejected.

### Style lock
Attempted CSS change rejected.

### Design-only
Theme/layout changes while text hashes remain identical.

## 12. Accessibility

Check:

- heading hierarchy;
- landmark structure;
- alt text;
- table headers;
- focus;
- keyboard rich-component operation;
- captions/transcripts warnings;
- color/contrast warnings where tooling supports.

## 13. Print regression

Reference fixtures render to PDF in automated Chromium plus manual Safari/Firefox review.

Check:

- page breaks;
- missing content;
- clipped tables;
- figure/caption separation;
- video fallback;
- unwanted editor UI;
- sensible typography.

## 14. Visual regression

Screenshots may be used for visual regression, but screenshots are never the canonical content representation.

Test viewports:

- desktop wide;
- desktop document;
- tablet;
- mobile;
- print page.

## 15. Conformance levels

Proposed:

### FRWD Core Reader
Can safely parse/render normal flow content.

### FRWD Editor
Can preserve/edit/save Core without destructive loss.

### FRWD Rich Reader
Supports required rich components.

### FRWD Publisher
Produces conforming standalone `.frwd.html`.

A product may implement a subset only if clearly declared.
