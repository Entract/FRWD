# @frwd/sanitize

Enforces the native `.frwd` profile: no arbitrary executable JavaScript, no
event-handler attributes, no external or unsafe URL schemes, and an allow-list
of elements, attributes and CSS.

Runs on import of an untrusted document and again on export. A document that
survives sanitization is safe to open.

Framework-agnostic.

Not implemented yet — see task `t-004`.
