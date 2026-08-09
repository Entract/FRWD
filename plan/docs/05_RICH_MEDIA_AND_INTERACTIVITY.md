---
category: feature
---

# FRWD Rich Media and Interactivity

## 1. Principle

A modern document should not treat static images as the final form of media.

FRWD makes rich objects first-class while preserving:

- flow;
- accessibility;
- offline portability;
- print fallbacks;
- security.

## 2. v0.1 rich object set

Required:

- image;
- video;
- audio;
- figure/caption;
- callout;
- disclosure;
- simple chart;
- embedded dataset metadata.

Optional for the first editor release:

- gallery.

Deferred:

- 3D;
- forms;
- live external data;
- arbitrary embeds.

## 3. Video

Prefer standard HTML video semantics.

FRWD wrapper:

```html
<frwd-video data-frwd-id="video-uuid">
  <figure>
    <video controls
           preload="metadata"
           poster="data:image/webp;base64,...">
      <source src="data:video/mp4;base64,..." type="video/mp4">
    </video>
    <figcaption data-frwd-id="caption-uuid">
      Short introduction.
    </figcaption>
  </figure>
</frwd-video>
```

Metadata may include:

- title;
- duration;
- transcript;
- poster;
- print link;
- accessibility description.

## 4. Video editing behavior

The editor should allow:

- replace video;
- set poster frame;
- edit caption;
- trim metadata later;
- set playback controls;
- choose print fallback.

It should not become a full video editor.

## 5. Audio

Same pattern:

- standard `<audio>`;
- caption/title;
- transcript where available;
- print fallback description/link.

## 6. Charts

FRWD charts are declarative.

Example:

```html
<frwd-chart
  data-frwd-id="..."
  data-type="bar"
  data-source="dataset-1"
  data-x="quarter"
  data-y="revenue">

  <figure>
    <img src="data:image/svg+xml;base64,..."
         alt="Revenue increased across four quarters.">
    <figcaption>Quarterly revenue.</figcaption>
  </figure>
</frwd-chart>
```

The runtime hydrates interaction.

The static child figure is the baseline fallback.

## 7. Dataset

Datasets may be stored as inert data:

```html
<script type="application/frwd-dataset+json"
        id="dataset-1">
{
  "columns": ["quarter", "revenue"],
  "rows": [
    ["Q1", 10],
    ["Q2", 13]
  ]
}
</script>
```

This is data, not executable script.

Larger CSV-like data may be encoded in an inert asset block in a future minor spec.

## 8. Disclosure

Use standard `<details>/<summary>` where it solves the problem.

Do not invent a FRWD component unnecessarily.

Example use:

- methodology detail;
- footnote explanation;
- supplementary information.

Print defaults to expanded.

**How that is achieved matters.** Print expansion is done in CSS, not in a `beforeprint` handler, because a publication must print correctly with JavaScript disabled — a script-driven expansion would drop content from exactly the printouts nobody can debug.

That constrains which disclosure to reach for. `frwd-disclosure` uses an ordinary `hidden` attribute, which CSS can override in every engine, so its content always prints. A closed native `<details>` cannot be force-expanded by CSS in every engine: `::details-content` covers Chromium and Firefox, WebKit has no equivalent today.

Therefore:

- use `<details>` freely for supplementary content the reader can take or leave;
- put **substantive** content that must reach paper in a `frwd-disclosure`, or author the `<details>` as `<details open>`.

This is checked rather than merely advised. A closed `<details>` containing a block object - anything the document model treats as an editable object in its own right - is a conformance error (`collapsed-substantive-content`). Inline convenience content inside a closed `<details>` is fine, because nothing is lost if a printout omits it.

## 9. Callout

A callout is semantic supporting content:

```html
<aside data-frwd-id="..." class="frwd-callout">
  ...
</aside>
```

A custom element is not required unless the editor needs additional state.

## 10. Galleries

A gallery is ordered media with:

- images/video;
- captions;
- accessible labels;
- static stacked/grid fallback.

Do not require a carousel runtime to understand its contents.

## 11. 3D future profile

A later `<frwd-model>` may support self-contained GLB.

Required future properties:

- poster;
- alt/description;
- safe trusted viewer runtime;
- no embedded arbitrary model scripts;
- print fallback;
- performance/size limits.

Do not implement before the basic document model is proven.

## 12. No arbitrary web embeds

v0.1 does not allow:

```text
iframe any website
YouTube embed
remote dashboard
arbitrary JavaScript widget
```

These undermine:

- offline portability;
- privacy;
- security;
- archival durability.

A future explicitly non-portable profile could consider controlled external embeds.

## 13. Media and AI

AI tools should receive media metadata and semantic relationships, not massive base64 payloads by default.

For example:

```json
{
  "nodeId": "video-7",
  "type": "video",
  "title": "Instrument setup",
  "duration": 21.4,
  "caption": "..."
}
```

The tool layer resolves/replaces actual bytes separately.

## 14. Print fallback contract

Every rich component MUST define one of:

- static representation;
- expanded representation;
- explicit print omission with visible textual reference.

No component should silently disappear from print if it carries substantive content.
