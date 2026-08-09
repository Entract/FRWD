# Fixtures

Reference FRWD documents. These are **proof, not just test data**.

Proving that FRWD can produce exceptionally good-looking documents — on screen
and in print — is central to the project, so the designed fixtures are a
first-class part of development. They also drive requirements back into
`format`, `sanitize` and `publisher`, and every one of them runs through the
conformance harness and the cross-browser suite.

Planned:

| Fixture | Purpose |
|---|---|
| `minimal/` | Smallest conforming document. Lands first, with the harness. |
| `cv/` | Dense typographic layout, print fidelity. |
| `scientific/` | Equations, figures, tables, cross-references. |
| `business-report/` | Charts, data, callouts, cover design. |
| `rich-manual/` | Video, audio, galleries, interactive disclosure. |

`minimal/` arrives with task `t-003`; the designed set with task `t-008`.
