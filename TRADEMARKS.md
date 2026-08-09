# FRWD trademark policy

"FRWD" and the FRWD logo are trademarks of Guy Monroe Entract.

## What the licence covers

The source code and specification in this repository are licensed under the
[Apache License 2.0](LICENSE). That licence is deliberately permissive: anyone
may use, modify, redistribute and commercialise this work, including building a
competing implementation of the FRWD format.

Trademark rights are separate from copyright and patent rights. Apache-2.0
section 6 says so explicitly — it grants no permission to use the licensor's
trade names, trademarks or service marks. This document sets out what we do and
do not permit, so that the line is clear rather than merely legal.

## Why the name is held back

The whole point of an open document format is that a file keeps working. That
promise only holds if "this software supports FRWD" means something specific.

If any product could market itself as *FRWD Certified* regardless of whether it
round-trips a document correctly, the guarantee would erode and users would go
back to distrusting their own files. Holding the name is how interoperability
stays enforceable without making the technology proprietary.

```text
FRWD code and specification        FRWD name and logo
Apache-2.0                          trademark policy
        │                                   │
        └── anyone may implement it         └── claims of official status,
            and ship it commercially            certification or endorsement
                                                need permission
```

## What you may do without asking

- State factually that your software reads, writes, implements, supports or is
  compatible with the FRWD format. For example: "Exports to FRWD", "FRWD import
  supported", "an open-source FRWD parser".
- Use the name in prose, documentation, articles, talks, academic work, course
  material, comparisons and reviews.
- Name a package or module descriptively, such as `frwd-parser-rust` or
  `python-frwd`, where the name plainly describes function rather than origin.
- Reproduce the logo unmodified to refer to the project — in a slide, an article
  or a compatibility list.
- Fork this repository and say so, provided you do not present the fork as the
  official project.

Nominative, descriptive and comparative use is fair use, and nothing here is
intended to restrict it.

## What needs permission

- **Claims of official status, certification or endorsement.** "FRWD Certified",
  "Official FRWD Editor", "FRWD Approved", "Powered by the FRWD team", or a
  conformance badge we did not issue.
- **Product, company or service names built on the mark** where the name reads
  as the source rather than the function — "FRWD Inc.", "FRWD Cloud",
  "FRWD Pro".
- **Modified logos**, or use of the logo as your own product's mark or app icon.
- **Domain names, social accounts and app-store listings** whose name would lead
  a reasonable person to think they are operated by the project.

The test in every case is confusion about origin: could someone reasonably
conclude that this project produced, vetted or endorsed your work? If yes, ask
first.

## Conformance

There is no conformance or certification programme yet. The format is at draft
0.1 and there is nothing to certify against. Until one exists and is published,
no one may claim FRWD certification — including this project.

When a programme does exist it will be public, testable against the conformance
fixtures in this repository, and available on the same terms to everyone.

## Asking

Open an issue at <https://github.com/Entract/FRWD/issues> or contact the project
maintainer. Reasonable requests are usually granted; the point of this policy is
to prevent misleading claims, not to make the name unusable.

## Changes

This policy may be updated. Changes are not retroactive: a permission already
granted stays granted under the terms in force when it was given.
