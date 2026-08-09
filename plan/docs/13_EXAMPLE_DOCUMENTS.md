---
category: feature
---

# FRWD Reference Document Scenarios

These examples exist to test the format. They are not separate products.

## 1. Profile / CV

### Why it is a useful test

A CV stresses:

- typography;
- dense information;
- sidebars;
- two-column layout;
- strict page count;
- print quality;
- mobile reflow;
- human text editing.

FRWD can additionally test rich media:

```text
Name
Role

[portrait / optional 20-second introduction video]

Experience                         Skills
--------------------------------  ----------------
...
```

Digital:
- video plays.

Print:
- poster image + optional video reference.

Mobile:
- sidebar stacks into reading flow.

The editor remains generic; it has no special "CV generator" architecture.

## 2. Scientific report

Tests:

- semantic sections;
- abstract;
- equations;
- figure/caption;
- table;
- references;
- supplementary video;
- print.

Possible AI command:

> Shorten the discussion by 20%, do not alter any reported numbers, and move Figure 3 after its first citation.

## 3. Business report

Tests:

- visual design;
- KPI cards;
- responsive grid;
- chart;
- tables;
- sidebars;
- print executive summary.

Possible AI command:

> Preserve all content but redesign this in a restrained institutional style.

## 4. Rich technical manual

Tests:

- instructions;
- callouts;
- images;
- inline demonstration video;
- disclosures;
- print fallbacks.

Digital:

```text
Step 4 — Replace the seal

[▶ 18-second demonstration]

[Important]
Do not...
```

Print:

```text
Step 4 — Replace the seal

[poster frame]
Demonstration video: reference/link

Important: Do not...
```

## 5. Proposal

Tests:

- cover;
- narrative;
- milestones;
- tables;
- rich project demo;
- designed pages;
- print.

## 6. Academic/technical application

Tests:

- flowing prose;
- fixed page target;
- bibliography;
- supporting media hidden/reduced in print;
- strong design without layout fragility.

## 7. Stress-test document

Create a deliberately difficult fixture with:

- very long headings;
- 10,000+ words;
- multiple tables;
- many figures;
- embedded short video;
- sidebar;
- nested lists;
- long URLs;
- footnotes later.

Use it to expose weak reflow/serialization assumptions.

## 8. AI generation benchmark

For the same content prompt, generate:

- DOCX;
- plain HTML;
- FRWD.

Human evaluation should compare:

- visual quality;
- editability;
- reflow after editing;
- mobile behavior;
- rich media;
- AI revision reliability;
- print quality.

This provides evidence for FRWD's actual value proposition.
