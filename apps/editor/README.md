# FRWD reference editor

The reference editing application. Deliberately the **last** thing built.

The structured editing layer and UI framework are not chosen yet. That decision
waits until the format, sanitize, operations and publisher work has taught us
what the editor actually needs, and will be recorded as an ADR when made.

Invariant 12 says FRWD must not depend on one editor library — that constrains
the *format*, not this app. This app may use whatever framework serves it best,
because it is a reference implementation, not the specification.

Not implemented yet — see task `t-010`.
