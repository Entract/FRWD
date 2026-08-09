---
category: feature
---

# Architecture decision records

Numbered, immutable records of decisions that shape FRWD.

Write one when a decision is hard to reverse, when it deviates from an invariant
in [`00_START_HERE.md`](../00_START_HERE.md), or when a future reader would
otherwise ask "why on earth is it like this?".

Naming: `NNNN-short-title.md`, e.g. `0001-single-html-source.md`.

Each record states: **Context** (what forced a decision), **Decision** (what we
chose, in the active voice), **Consequences** (what this makes easy, what it
makes hard, what it forecloses), and **Status** (proposed / accepted /
superseded by NNNN).

Records are never edited to change their meaning. A decision that no longer
holds is superseded by a new record, not rewritten — the point of the log is
that it shows what was believed at the time.

The first records to write, capturing decisions already made, arrive with task
`t-009`: one HTML document as the native source rather than a ZIP container; no
arbitrary script in the native profile; and the TypeScript/pnpm/Vitest/Playwright
toolchain.
