# Bug Draft Contract

Read this file when creating or updating the local draft. `bug-draft.json` is the structured source of truth; generate `bug-report.md` from it and do not maintain conflicting content.

## Storage

```text
.qa/bugs/<draft-id>/
├── bug-draft.json
├── bug-report.md
└── evidence/
    ├── original/
    └── annotated/
```

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
