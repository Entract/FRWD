# Tests

| Suite | Runner | Covers |
|---|---|---|
| `harness/` | — | Fixture discovery shared by the suites below. Not a suite itself. |
| `conformance/` | Vitest | Every fixture against the format spec: conformance verdict and exact diagnostics, plus — for fixtures marked canonical — that the stored bytes match reference canonical serialization. |
| `roundtrip/` | Vitest | Semantic round-trip stability and deterministic serialization across the fixture corpus. |
| `security/` | Vitest | The native safety profile across the whole corpus: exact profile diagnostics, that inspection changes nothing, that composed conformance combines both layers, and that sanitization repairs a document without destroying it. |
| `browser/` | Playwright | Real published `.frwd.html` files opened over `file://` in Chromium, Firefox and WebKit: rendering, runtime installation, component hydration, an operable disclosure, no network on load, print expansion, narrow viewport, and the same documents with JavaScript disabled. |
| `visual/` | Playwright | Screen and print rendering of the designed fixtures. |

Unit tests live beside the code they cover, in `packages/*/test`.

Conformance fixtures are written early, before the editor exists — the format is
the product, so its guarantees are tested first. Adding a fixture is two files
under `fixtures/` and no wiring; see [`fixtures/README.md`](../fixtures/README.md).
