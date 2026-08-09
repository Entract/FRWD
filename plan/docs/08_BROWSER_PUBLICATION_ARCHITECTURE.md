---
category: feature
---

# FRWD Browser Publication Architecture

## 1. Goal

A user must be able to send a FRWD publication to someone who has never installed FRWD.

The recipient receives:

```text
report.frwd.html
```

and opens it in an ordinary modern browser.

## 2. Publication contains

The publication is one physical HTML file containing:

- semantic document;
- document CSS;
- all required assets;
- trusted FRWD runtime;
- interaction definitions;
- optional editor UI/runtime;
- print rules.

No server is required.

## 3. Publication profiles

### Read profile

Smallest runtime.

Supports:

- rich components;
- print;
- accessibility helpers.

### Editable profile

Includes:

- read capabilities;
- Edit button;
- browser editor;
- undo;
- Save As.

Default MVP publication SHOULD be editable unless file size/runtime complexity becomes unacceptable.

## 4. Baseline without JavaScript

With JavaScript disabled, the user should still see:

- title;
- headings;
- prose;
- images;
- tables;
- captions;
- playable standard media where the browser supports it;
- static chart fallbacks;
- expanded/visible fallback information.

Advanced interaction/editing may disappear.

## 5. Edit mode

On user action:

```text
[Edit]
```

the runtime:

1. validates embedded FRWD structures;
2. initializes the editor;
3. enables normal rich-text editing;
4. exposes block/media controls;
5. records changes;
6. lets the user generate an updated file.

## 6. Saving from a self-contained HTML file

A page opened directly from local disk normally does not have unrestricted permission to overwrite itself.

Therefore universal behavior is:

```text
Edit
  ↓
Save
  ↓
Generate updated one-file HTML
  ↓
Save As / browser download
```

Where a trusted installed editor/PWA has an authorized file handle, direct save can be offered.

The universal promise is **editable and saveable**, not "every browser can silently overwrite the original file."

## 7. Publishing from `.frwd`

Conceptually:

```text
native .frwd
   +
standard runtime
   =
.frwd.html
```

The publisher MUST NOT:

- flatten text to canvas;
- rasterize the document;
- replace semantics with coordinates;
- require external CDNs.

## 8. Runtime ownership

The runtime is publisher-owned standard code.

Document authors may declare behavior but cannot provide arbitrary executable code in conforming FRWD.

Example:

```html
<frwd-chart data-type="line" ...>
```

The trusted runtime supplies chart behavior.

## 9. Runtime version

Published files SHOULD record:

```html
<meta name="frwd-runtime-version" content="0.1.x">
```

Old documents remain self-contained because their runtime travels with them.

## 10. Runtime upgrades

An editor may offer:

> Upgrade embedded FRWD runtime

This should not alter document content.

A file should never require a future server to obtain its old runtime.

## 11. Size considerations

Embedding a runtime in every file costs bytes.

This is acceptable if:

- baseline runtime remains compact;
- optional capabilities are modular at publish time;
- only used rich-component modules are included where practical.

Example:

A text/image report should not embed a 3D viewer.

## 12. Offline requirement

A portable `.frwd.html` must work with networking disabled.

Opening it should not automatically contact:

- analytics;
- font servers;
- CDNs;
- AI endpoints;
- FRWD servers.

Optional AI functions may require network access only after explicit user action and configuration.

## 13. Browser support

Target current major engines:

- Chromium;
- Firefox;
- WebKit/Safari.

The release process pins tested versions.

FRWD content should use standards-based HTML/CSS rather than relying on one browser engine.

## 14. Print

The same publication prints using document print CSS.

Editor controls never appear in print.

## 15. Useful archival property

Even if the FRWD runtime stops working decades later, the file should still contain normal semantic HTML and embedded media that generic tooling can recover.
