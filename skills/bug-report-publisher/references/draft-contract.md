# Bug Draft Contract

Read this file when creating or updating the local draft. `bug-draft.json` is the structured source of truth; generate `bug-report.md` from it and do not maintain conflicting content.

## Storage

```text
.qa/bugs/<DRAFT-FOLDER>/
├── bug-draft.json
├── bug-report.md
└── evidence/
    ├── original/
    └── annotated/
```

**`<DRAFT-FOLDER>` is `<draft-id>-<title-slug>`**, not the bare draft id — same reason as
`qa-output/`'s `<STORY-FOLDER>`: a listing of `.qa/bugs/` should read at a glance instead of
forcing a lookup into each `bug-draft.json`. `<title-slug>` is the draft's title (already decided
in Workflow step 3, before this folder is created in step 6 — see `bug-template.md`) in kebab-case
(lowercase, spaces and punctuation turned to hyphens, collapsed to single hyphens, no
leading/trailing hyphen), trimmed to roughly the first 40 characters at a word boundary. Example:
`BUG-DRAFT-20260917-001` titled "Scheduled Orders — Internal Server Error Appears When Confirming
the Selected Time" becomes `BUG-DRAFT-20260917-001-scheduled-orders-internal-server-error`.

`draftId` itself — the value stored in `bug-draft.json` and used to prefix evidence filenames (see
`visual-evidence.md`) — never carries the slug; only the folder name does.

- **Before creating the folder, check for one that already starts with `<draft-id>`**
  (`.qa/bugs/<draft-id>*/`) and reuse it rather than creating a second one because the slug drifted
  (a reworded title, a slightly different truncation). Never rename an existing draft folder to
  match a newly derived slug.

## Screenshot Storage

**Every screenshot produced while working this draft — regardless of whether it ends up
supporting the reported defect, is neutral, or contradicts/disproves it** (e.g. a reproduction
attempt that shows the behavior no longer occurs) **— once annotated, is saved under
`.qa/bugs/<DRAFT-FOLDER>/evidence/`.** This applies even if the draft is ultimately cancelled or
never published.

This overrides `foundation.md`'s general screenshot-routing rule for this skill: bug-related
visual evidence always stays colocated with its own draft folder, not the general
`.qa/screenshots/<BUG-ID>/` path.

## Required Shape

```json
{
  "schemaVersion": "1.0",
  "draftId": "BUG-DRAFT-YYYYMMDD-001",
  "status": "awaiting-approval",
  "title": "Feature — Specific incorrect behavior",
  "descriptionPath": "bug-report.md",
  "reproduction": {
    "status": "attempted-and-confirmed",
    "notes": null
  },
  "environment": {
    "application": null,
    "environment": null,
    "build": null,
    "platform": null,
    "device": null,
    "os": null,
    "browser": null,
    "language": null,
    "role": null
  },
  "severity": {
    "value": null,
    "rationale": null
  },
  "priority": {
    "value": null,
    "isRecommendation": true,
    "rationale": null
  },
  "traceability": {
    "requirementIds": [],
    "testCaseIds": [],
    "flowIds": [],
    "runIds": []
  },
  "evidence": [],
  "duplicateCheck": {
    "status": "pending",
    "matches": []
  },
  "publishing": {
    "trackingTool": null,
    "project": null,
    "issueType": "Bug",
    "action": "create",
    "approval": "pending",
    "issueId": null,
    "issueUrl": null
  }
}
```

`reproduction.status` is one of `attempted-and-confirmed`, `attempted-and-not-reproducible`,
`skipped-no-access`, or `skipped-by-explicit-user-request` — see the skill's Reproduction section.
Use `notes` for anything the status alone does not explain (what access was missing, why the user
asked to skip it).

## States

Main path:

```text
collecting-information
→ draft-ready
→ evidence-ready
→ duplicate-checked
→ awaiting-approval
→ approved
→ publishing
→ published
```

Alternative states:

```text
needs-information
needs-business-clarification
duplicate-found
publishing-partial
publishing-failed
saved-as-draft
cancelled
```

## Consistency Rules

- Regenerate `bug-report.md` after material draft changes.
- Every evidence entry must point to an existing file.
- Do not advance to `awaiting-approval` without a set `reproduction.status`.
- Keep approval pending until the user approves the exact final action and upload list.
- Save an issue ID immediately after successful creation, before uploading attachments.
- Do not clear a saved issue ID when later attachment upload fails.
