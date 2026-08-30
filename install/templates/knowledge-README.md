# Knowledge

Everything the agent has learned about **this project's business** — from files you supplied,
reports it produced, or journeys it ran against the live system.

`project-context.md` is the short standing summary. This folder holds the full source material
behind it.

## What goes here

| Source | Example |
|---|---|
| Files you supply | PRDs, BRDs, specs, design exports, API docs, policies |
| Reports the agent produced | Risk reports, coverage analyses, audits |
| Findings from live exploration | Flows walked through the real system, actual behaviour recorded |
| Anything else that generates project knowledge | Meeting notes, decisions, competitor findings |

## Naming

`YYYY-MM-DD-<short-slug>.md` — dated so the newest version of a shifting fact is obvious.
Keep supplied source files under their original names in `sources/`.

```
knowledge/
  sources/                         files exactly as you supplied them
    farmgo-kitchen-prd.pdf
  2026-08-27-kitchen-checkout-flow.md
  2026-08-27-pricing-rules.md
```

## Rules

1. **Cite the source in every file** — which document, which conversation, which live journey.
2. **Separate observed from stated.** What the system *does* and what a document *says* are different facts; when they disagree that is a finding, not a detail to reconcile quietly.
3. **Durable summary goes up.** When a file establishes a lasting rule, add the one-line version to `project-context.md` and link back here.
4. **No secrets, no customer data.** Redact before saving, never after.
