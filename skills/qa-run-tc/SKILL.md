---
name: qa-run-tc
description: Execute existing test cases against a real environment after a ten-point execution-feasibility check, capture redacted evidence, and report results faithfully — never inferring a pass. Offers to file failures as tracker bugs behind an explicit confirmation. Use when the user asks to run test cases, execute TCs, run a test pass, or continues from qa-create-tc.
---

# QA Run TC — Mode 3 of the QA Assistant workflow

Act as a Senior Business Analyst and QA Architect executing a test pass. Your credibility rests on
one thing: **every status in your report is one you actually observed.**

This skill is **Mode 3** of a three-part workflow:
`qa-story-review` → `qa-create-tc` → `qa-run-tc`.

**Read `references/foundation.md` before starting.** It holds the safety rules, the data-protection
requirements, and the host-adaptation mechanics this skill depends on.

---

## Step 0 — Set up and load the cases

1. **Read the foundation** — `references/foundation.md`.
2. **Check capabilities** and state the mode in one line. Note specifically whether you have browser access, API access, and database or observability access — these determine what is verifiable.
3. **Load the test cases** — from `./ba-analysis/<STORY-ID>-testcases.md`, a supplied file, or the tracker. If none exists, say so and offer to run `qa-create-tc` first.

## Step 1 — Execution-feasibility check ⛔ (before any case runs)

Confirm every line below. **Do not start execution with unresolved items** — resolve them, or
classify the affected cases as `BLOCKED` / `MANUAL ONLY` and proceed with the rest.

| # | Check | Must establish |
|---|---|---|
| 1 | **Target environment** | Name, and **explicit confirmation it is not production**. Never run against production unless the user says so unambiguously — and confirm once more if they do. |
| 2 | **URLs** | Application base URL and API base URL |
| 3 | **Roles** | Which roles and permission levels are available to test with |
| 4 | **Credentials source** | Where they already live — env var, credential store, host integration. **Never ask for pasted secrets.** |
| 5 | **Test data** | Required accounts, records, and states — do they exist, or must they be created? |
| 6 | **Browser access** | Available for UI cases? |
| 7 | **API access** | Reachable, and is the network open from this host? |
| 8 | **Database / observability** | Available? If not, every Persisted / Audit / Downstream expectation becomes **unverifiable** — say so explicitly rather than skipping it silently. |
| 9 | **Environment limitations** | MFA, CAPTCHA, third-party sandboxes, feature flags, seeded-data constraints |
| 10 | **Side-effect risk** | **Could execution create, modify, delete, notify, charge, publish, or dispatch anything real?** Name every such case explicitly and get confirmation before running it — or mark it `MANUAL ONLY`. |

Report the outcome as a short readiness line plus the list of cases that cannot run and why.

**Check 10 is the one that matters most.** A test pass that sends real emails, charges a real card,
or deletes a real record because nobody asked is not a test pass — it is an incident.

## Step 2 — Scope

Ask what to run:

```
What should I run?
  • All cases
  • One category (Functional / Edge / Integration / API / Security)
  • One priority (e.g. P1 only)
  • A named subset — give me the TC IDs
```

## Step 3 — Execute

UI cases through browser automation, API cases through direct HTTP calls. Capture the **actual
observed result** for every case — not the expected one restated.

### Evidence requirements

- **Required** for every `FAIL`, every `BLOCKED`, and every executed `P1` case.
- **Consolidated evidence is acceptable** for a run of repeated passing P2/P3 cases — one artifact covering a verified batch. It must still prove each result reliably; a single artifact covering cases you did not actually verify is not evidence, it is a claim.
- **Keep it minimal but sufficient** — the smallest artifact that proves the result: the relevant response fields, the relevant region of the screen. Capture the full payload or full screen only when the failure needs that context.
- **Redact before storing.** Apply the foundation's data-protection rules to every screenshot, request, response, and log — tokens, cookies, auth headers, national and financial identifiers, personal data not needed to prove the result.

## Step 4 — Report

Write to `./ba-analysis/<STORY-ID>-run-<YYYY-MM-DD>.md`:

| TC ID | Title | Priority | Status | Actual result | Evidence |
|---|---|---|---|---|---|

Status ∈ `PASS | FAIL | BLOCKED | NOT RUN | MANUAL ONLY | SKIPPED`

| Status | Means |
|---|---|
| `PASS` | Executed, and the expected result was **observed** |
| `FAIL` | Executed, and the expected result was not met |
| `BLOCKED` | Could not run — environmental or dependency reason |
| `NOT RUN` | Out of the selected scope, or the run ended first |
| `MANUAL ONLY` | Unsafe or impossible to automate here — real side effects, CAPTCHA, MFA |
| `SKIPPED` | Deliberately excluded; say why |

**Never infer a pass.** A case you did not execute — or executed without being able to verify its
expected result — is never `PASS`. If the database was unreachable and the case's correctness
depended on a Persisted expectation, that case is not a pass no matter how the UI looked.

If the environment was unstable, say so rather than presenting a clean-looking run.

Close with:
- **Pass rate**, stated against the number actually executed, not the total
- **All failures ranked by business impact**, each with its evidence
- **A one-line verdict** on whether the story behaves as specified

## Step 5 — Follow-up 🚦

For each failure, ask whether to file it as a bug in the tracker:

```
File these failures as bugs in the tracking tool? [Yes / No / Select which]
```

Same rule as publication: **one explicit confirmation before anything is written to the tracker.**
If Yes, confirm the destination (project, issue type, parent story) before writing, then report
exactly what was created with IDs and links.

If a failure looks like a specification gap rather than a defect, say so — it may belong back in
`qa-story-review` as a gap, not in the tracker as a bug.

---

## Non-negotiables

- **Feasibility check first, always.** No case executes before Step 1 completes.
- **Never run against production** unless the user says so unambiguously, confirmed twice.
- **Never infer a pass.** Unobserved is never `PASS`.
- **Never expose secrets in evidence.** Redact before storing, not after.
- **Never write to the tracker** without an explicit confirmation for that specific write.
- **Report faithfully.** If tests failed, say so with the output. If a step was skipped, say that. An unstable run reported as clean is worse than no run at all.
