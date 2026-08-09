# Tests

| Suite | Runner | Covers |
|---|---|---|
| `conformance/` | Vitest | Fixtures against the format spec. |
| `roundtrip/` | Vitest | Semantic round-trip stability and deterministic serialization. |
| `security/` | Vitest | The native no-script profile against known injection vectors. |
| `browser/` | Playwright | Published `.frwd.html` in Chromium, Firefox and WebKit — offline, and with JavaScript disabled. |
| `visual/` | Playwright | Screen and print rendering of the designed fixtures. |

Unit tests live beside the code they cover, in `packages/*/src`.

Conformance fixtures are written early, before the editor exists — the format is
the product, so its guarantees are tested first.
