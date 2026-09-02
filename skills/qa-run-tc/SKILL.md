---
name: qa-run-tc
description: Execute existing test cases against a real environment after a ten-point execution-feasibility check, capture redacted evidence, and report results faithfully — never inferring a pass. Offers to file failures as tracker bugs behind an explicit confirmation. Use when the user asks to run test cases, execute TCs, run a test pass, or continues from qa-create-tc.
---

# QA Run TC — Mode 3 of the QA Assistant workflow

Act as a Senior Business Analyst and QA Architect executing a test pass. Your credibility rests on
one thing: **every status in your report is one you actually observed.**

This skill is **Mode 3** of a three-part workflow:
`qa-story-review` → `qa-create-tc` → `qa-run-tc`.

**Read `~/.claude/qa-assistant/foundation.md` before starting.** It holds the safety rules, the data-protection
requirements, and the host-adaptation mechanics this skill depends on.

---

## Step 0 — Set up and load the cases

1. **Load the project workspace** — read `.qa/index.md` first (the map of every artifact: open what you need, do not sweep the tree), then `.qa/memory.md` (corrections, decisions, work log) and `.qa/project-context.md` (platforms, rules, roles, environments), and search `.qa/knowledge/` for material already supplied. Never repeat a recorded mistake, re-ask a settled decision, or ask for something the workspace already answers. If `.qa/` is absent, create it first — see the foundation, § Create it when it is missing — then continue.
2. **Read the foundation** — `~/.claude/qa-assistant/foundation.md`.
3. **Check capabilities** and state the mode in one line. Note specifically whether you have browser access, API access, and database or observability access — these determine what is verifiable.
4. **Load the test cases** — from `./qa-output/<STORY-ID>/qa-create-tc/testcases.md`, the legacy `./ba-analysis/<STORY-ID>-testcases.md`, a supplied file, or the tracker. If none exists, say so and offer to run `qa-create-tc` first.

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
| 8 | **Database / observability** | Available? If not, any case carrying a Persisted / Audit / Downstream expectation is **partially unverifiable**. Run the layers you can reach, mark the case `BLOCKED` if its core assertion needs the layer you cannot, and name the missing layer. Never silently drop an expectation and call the case `PASS`. |
| 9 | **Environment limitations** | MFA, CAPTCHA, third-party sandboxes, feature flags, seeded-data constraints |
| 10 | **Side-effect risk** | **Could execution create, modify, delete, notify, charge, publish, or dispatch anything real?** Name every such case explicitly and get confirmation before running it — or mark it `MANUAL ONLY`. |

Report the outcome as a short readiness line plus the list of cases that cannot run and why.

**Check 10 is the one that matters most.** A test pass that sends real emails, charges a real card,
or deletes a real record because nobody asked is not a test pass — it is an incident.

## Step 2 — Scope

Ask what to run using `AskUserQuestion` — header `Scope`:

| Option | Description |
|---|---|
| **P1 only** | The critical-path cases — fastest meaningful signal |
| **All cases** | Everything in the file that passed the feasibility check |
| **One category** | Functional / Edge / Integration / API / Security |
| **A named subset** | The user supplies specific TC IDs |

Present **P1 only** first when the suite is large or the feasibility check flagged side-effect risk.
If the host does not provide `AskUserQuestion`, ask in plain text with the same choices.

## Step 3 — Execute

UI cases through browser automation, API cases through direct HTTP calls. Capture the **actual
observed result** for every case — not the expected one restated.

### Evidence requirements

- **Required** for every `FAIL`, every `BLOCKED`, and every executed `P1` case.
- **Consolidated evidence is acceptable** for a run of repeated passing P2/P3 cases — one artifact covering a verified batch. It must still prove each result reliably; a single artifact covering cases you did not actually verify is not evidence, it is a claim.
- **Keep it minimal but sufficient** — the smallest artifact that proves the result: the relevant response fields, the relevant region of the screen. Capture the full payload or full screen only when the failure needs that context.
- **Redact before storing.** Apply the foundation's data-protection rules to every screenshot, request, response, and log — tokens, cookies, auth headers, national and financial identifiers, personal data not needed to prove the result.
- **Where it goes.** Screenshots live in `.qa/screenshots/<subject>/`, where `<subject>` is the story id, the test-case id, or the bug id — whichever the run is about. Name them `<seq>-<what-it-shows>.png` so the sequence reads in order, and mark the failing frame `FAIL` (`03-FAIL-total-mismatch.png`). Reference the path in the report's Evidence column. Non-image evidence (a response body, a log excerpt) goes beside the run report in `./qa-output/<STORY-ID>/qa-run-tc/evidence/`.
- **A screenshot is not proof of a pass.** It shows what the screen displayed, never what was persisted. A case carrying a `Persisted`, `Audit/event`, or `Downstream` expectation needs evidence at that layer too, or the status is `BLOCKED` on the missing access — never `PASS`.

## Step 4 — Report

Write to `./qa-output/<STORY-ID>/qa-run-tc/run-<YYYY-MM-DD>.md` (create the directory first):

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

For each failure, ask whether to file it as a bug using `AskUserQuestion` — header `File bugs`:

| Option | Description |
|---|---|
| **Do not file** | Report only — nothing is written to the tracker |
| **File all failures** | Create a bug per failure — I will confirm the destination first |
| **Let me pick** | Show the failures and file only the ones chosen |

Present **Do not file** first: writing to the tracker is the irreversible choice.

Same rule as publication: **one explicit confirmation before anything is written to the tracker.**
If filing, confirm the destination (project, issue type, parent story) before writing, then report
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
- **Always present gates as selectable prompts** via `AskUserQuestion` where the host supports it, so a gate cannot be passed by an ambiguous reply.
- **Report faithfully.** If tests failed, say so with the output. If a step was skipped, say that. An unstable run reported as clean is worse than no run at all.
