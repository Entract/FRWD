---
category: feature
---

# FRWD Security, Trust and Portability

## 1. Threat model

A FRWD may arrive from an untrusted sender.

Risks include:

- script execution;
- network tracking;
- malicious CSS;
- phishing UI;
- oversized assets;
- hostile SVG;
- unsafe URLs;
- parser denial of service;
- AI-generated dangerous markup;
- maliciously modified `.frwd.html`.

## 2. Native safety principle

A native `.frwd` is **data, not software**.

It contains no arbitrary executable script.

The editor parses it without executing source content.

## 3. HTML sanitizer

Reject/remove at minimum:

- executable `<script>`;
- inline event handlers;
- `<object>`;
- `<embed>`;
- unsafe iframe;
- `<base>`;
- meta refresh;
- `javascript:` URLs;
- dangerous executable schemes;
- unauthorized custom elements;
- remote scripts/styles;
- automatic remote media.

## 4. CSS sanitizer

The safe portable profile must prevent CSS from causing automatic remote fetches.

Review or reject:

- `@import`;
- remote `url(...)`;
- behavior inconsistent with supported browsers;
- CSS designed to obscure/impersonate editor security UI.

Allow rich local styling.

## 5. SVG

SVG can carry active content.

Sanitize:

- scripts;
- event handlers;
- external references;
- unsafe `foreignObject`;
- unsafe URLs.

The editor may offer a strict mode that rasterizes hostile/unsupported SVG.

## 6. Publication HTML caveat

A `.frwd.html` is ultimately an HTML program because it contains the standard runtime.

A malicious sender can modify any HTML file outside the FRWD specification.

Therefore:

- a conforming publication is safe-by-design;
- FRWD software can validate a publication;
- ordinary browsers cannot prove that an arbitrary received HTML file contains only the official runtime.

Treat unknown `.html` files with the normal trust expectations of web content.

Do not make misleading claims that the file extension alone makes HTML safe.

## 7. Network-free default

Conforming portable FRWD must make no automatic network requests.

External hyperlinks are permitted because the user chooses to follow them.

## 8. Asset limits

The editor must defend against:

- extremely large base64 data;
- excessive DOM node counts;
- decompression-like encoded asset abuse;
- huge SVG complexity;
- video memory pressure.

Use configurable limits and progressive loading.

## 9. Embedded video

Do not decode all media at document load.

Use:

- metadata preload;
- poster images;
- lazy loading where supported;
- user playback.

## 10. Integrity

The manifest MAY record SHA-256 hashes for significant embedded assets.

Hashing supports corruption detection, not authorship.

## 11. Digital signatures

Deferred.

Do not invent custom cryptography in v0.1.

A later profile can sign a canonicalized document + asset digest list.

## 12. AI output is untrusted

Model output must pass:

- HTML sanitizer;
- CSS sanitizer;
- structural validation;
- ID uniqueness validation;
- URL validation;
- asset validation.

AI does not receive a privileged bypass.

## 13. File ownership/privacy

Basic editor functionality should work locally.

The FRWD editor must not upload the user's document merely to open or render it.

If cloud AI is invoked, the product must make clear which content is being sent according to the configured AI provider/workflow.

## 14. No hidden tracking

Portable documents cannot include silent analytics/tracking under the conforming profile.

## 15. Graceful portability

If FRWD software is unavailable:

- `.frwd` remains HTML-family text;
- normal text and markup can be extracted;
- embedded media uses standard encodings/types;
- `.frwd.html` can be opened directly as HTML.

This is an intentional anti-lock-in property.
