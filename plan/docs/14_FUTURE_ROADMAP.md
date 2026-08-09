---
category: feature
---

# FRWD Future Roadmap

## 1. v0.1

Prove:

- core semantic format;
- flowing editor;
- theme/CSS system;
- images;
- video;
- tables;
- simple chart;
- standalone browser publication;
- AI operations;
- print.

## 2. v0.2 candidates

- comments;
- tracked suggestions;
- semantic citations;
- footnotes/endnotes;
- richer chart grammar;
- templates;
- more robust CSS inspector;
- accessibility report;
- Markdown import/export;
- basic HTML import.

## 3. v0.3 candidates

- DOCX import prototype;
- DOCX export prototype;
- bibliography formats;
- change review;
- linked/reference asset mode for huge working documents;
- richer tables;
- document variables.

## 4. v0.5 candidates

- optional 3D component;
- digital signatures design;
- encrypted document research;
- collaboration protocol based on FRWD operations;
- EPUB export;
- improved print/paged-media engine if browser CSS is insufficient.

## 5. v1.0 bar

Do not call FRWD 1.0 until:

- final name/extension cleared;
- format spec stable;
- conformance suite public;
- migrations proven;
- security reviewed;
- browser publication proven;
- more than one real document genre is in sustained use;
- at least one implementation path independent of the reference editor is credible;
- no editor-specific JSON leaks into the format;
- round-trip stability is strong.

## 6. Possible standards relationship

FRWD should remain open to interoperability with:

- DocLang for AI/document exchange;
- HTML standards;
- MathML;
- EPUB;
- DOCX/ODF import/export;
- established citation formats.

Do not create new sub-standards when an established representation can be mapped cleanly.

## 7. Collaboration

FRWD Ops creates a natural future sync model:

```text
base revision
+ semantic operations
+ actor
+ timestamp
```

A cloud collaboration server could exchange operations without changing the file model.

Collaboration remains optional.

## 8. Large media

The one-file principle is powerful but video can create very large files.

Future profile options to investigate:

- portable self-contained `.frwd`;
- working/project `.frwd` with explicitly linked local assets;
- "publish portable" command that embeds dependencies.

Do not add this complexity until real usage proves it necessary.

## 9. Editing runtime evolution

A self-editing `.frwd.html` may embed a runtime version.

Future editor can upgrade it.

Old files keep functioning because the runtime travels with them.

## 10. Naming

FRWD is the working identity.

Before public launch perform:

- trademark search;
- extension collision search;
- package registry search;
- domain/searchability review;
- media-type/IANA strategy;
- open-source project name check.

Do not freeze public branding before this is complete.
