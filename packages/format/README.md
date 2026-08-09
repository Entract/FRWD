# @frwd/format

Reads and writes a `.frwd` document: semantic HTML parsing, stable `data-frwd-id`
object identity, metadata, CSS/theme and embedded assets, and deterministic
serialization.

The contract is **semantic round-trip stability**: a no-op open/save preserves
document identity, every stable id, semantic structure, content, CSS, metadata
and embedded assets. Output is deterministic for a given input; original
whitespace and attribute formatting are not format invariants.

Framework-agnostic. No editor, UI or AI-vendor dependencies.

Not implemented yet — see task `t-002`.
