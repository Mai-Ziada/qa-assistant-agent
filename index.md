# Repository Index

**Read this before searching the repository.** It maps every file to what it holds, so you can open
the one file you need instead of sweeping the tree.

Two indexes exist and they cover different things:

| Index | Covers | Maintained by |
|---|---|---|
| **`index.md`** (this file) | The agent's own machinery — skills, templates, installer, docs | A human, when files are added or removed |
| **`.qa/index.md`** (in each installed project) | That project's work — stories, deliverables, knowledge, evidence | The agent, after every run |

Looking for a *deliverable* or something learned about a product? That is `.qa/index.md` in the
project, not this file.

---

## Where to look for what

| You need | Go to |
|---|---|
| The rules every skill obeys — safety, gates, depth, workspace, output paths | `install/shared/foundation.md` § 1–9 |
| How a story is analysed and scored | `skills/qa-story-review/SKILL.md` |
| How test cases are derived and prioritised | `skills/qa-create-tc/SKILL.md` |
| How cases are executed and reported | `skills/qa-run-tc/SKILL.md` |
| API sweeps, journeys, contract checks | `skills/api-testing/SKILL.md` |
| Retesting a bug after a fix | `skills/Smart_ReTest/SKILL.md` |
| Exploring a whole running system page by page | `skills/qa-system-explorer/SKILL.md` |
| Mapping an unclear flow, then planning regression from it | `skills/flow-to-test-plan/SKILL.md` |
| Automating a flow in Playwright, and keeping it working | `skills/agentic-flow-builder/SKILL.md` |
| Writing up a defect and filing it to the tracker | `skills/bug-report-publisher/SKILL.md` |
| Understanding what a skill does before running it | `skills/qa-coach/SKILL.md` |
| Recording what a run learned — the only writer to `.qa/` | `install/shared/updating-the-workspace.md` |
| Which skill handles a request | `skills/qa-assistant/SKILL.md` § Step 2, or `agents/qa-assistant.md` |
| What the workspace files are for | `install/templates/` |
| How installation works | `install.sh`, `README.md` § Install |
| How a missing `.qa/` gets created | `install/shared/foundation.md` § 8b, Create it when it is missing |
| How removal works, and what survives it | `uninstall.sh`, `README.md` § Uninstall |

---

## Skills

Each skill is one `SKILL.md` with YAML frontmatter (`name`, `description`) that decides when it
activates. The ten working skills read the shared `install/shared/foundation.md` — one copy, not
one per skill. Only `flow-to-test-plan` carries a `references/` directory of its own, for the flow
schema.

### `skills/qa-assistant/SKILL.md`
Entry point. Shows the nine modes and routes to one. **Step 1** menu · **Step 2** routing table
mapping numbers and phrases to skills · **Step 3** chaining rules. Routes rather than works.

### `skills/qa-story-review/SKILL.md` — stage 1
Analyse a story before anything is built.
**Step 1** ingest · **Step 2** dependency mapping · **Step 3** expert review lenses ·
**Step 4** the report, including a design-versus-story review and a scored readiness verdict ·
**Step 5** approval gate 1 · **Step 6** chain to test cases.
Under 70% readiness holds test-case generation until the gaps are closed.
Writes `qa-output/<STORY-FOLDER>/qa-story-review/analysis.md`.

### `skills/qa-create-tc/SKILL.md` — stage 2
Generate test cases from a story or an approved analysis.
**Step 1** coverage by category — functional positive and negative, edge, integration, API, UI/UX,
security, with mobile lifecycle folded in for mobile stories ·
**Step 1b** the derivation sweep: every stated rule owes its violation, every technique owes all its
targets, every raised gap owes the case that catches it ·
**Step 2** priority by business impact · **Step 3** case format · **Step 4** deliverables ·
**Steps 5–6** two separate gates — approving cases is not approval to publish.
Writes `qa-output/<STORY-FOLDER>/qa-create-tc/testcases.md`.

### `skills/qa-run-tc/SKILL.md` — stage 3
Execute cases against a real environment.
**Step 1** a ten-point feasibility check that runs before any case ·
**Step 3** execution · **Step 4** the report · **Step 5** optional bug filing behind a confirmation.
Never infers a pass; unobserved is never `PASS`.
Writes `qa-output/<STORY-FOLDER>/qa-run-tc/run-<date>.md`, evidence in `.qa/screenshots/`.

### `skills/api-testing/SKILL.md` — specialist
Three modes: `API_SWEEP` endpoint bug-hunting · `API_JOURNEY` ordered business flows ·
`API_CONTRACT` live behaviour versus documented spec.
**Phase 1** intake · **URL Source Protocol** · **Shared Execution Rules** · a section per mode ·
**Tracker Filing Rules**. Continues from a story's API cases when they exist.
Writes `qa-output/<STORY-FOLDER>/api-testing/`.

### `skills/Smart_ReTest/SKILL.md` — specialist
Retest a bug after a fix. **Quick Retest** — verify, update status, comment.
**Deep Retest** — five evidence-driven stages: readiness gate, original retest, deep sanity,
mapped-bug dependency chain, final decision. Verifies UI and persisted data agree.
Writes `qa-output/<BUG-ID>/Smart_ReTest/`.

### `skills/qa-system-explorer/SKILL.md` — specialist, mode 6
Deep exploration of a **running system** rather than a story, so it sits outside the three-stage
chain while still being reachable from the `/qa-assistant` menu.
**§ 2** required inputs and workspace · **§ 3** safety rules · **§ 4** the six statuses ·
**§ 5** environment and access validation · **§ 6** the System Exploration Map, persisted after
every page as the run's recovery point · **§ 7** the per-page procedure · **§ 8–9** field and action
checklists · **§ 10–12** scenario categories, dependency analysis, expected-result sourcing ·
**§ 13–15** evidence, reproduction, severity · **§ 16** the page completion gate · **§ 17** the page
report · **§ 18** the final report with coverage statistics · **§ 19** stop conditions ·
**§ 21.1** three gates — the map, every destructive action, and tracker filing.
Never marks a page Completed on a partial pass; Partial and Blocked carry reasons.
Writes `qa-output/system-exploration/`, evidence in `.qa/screenshots/system-exploration/`.

### `skills/agentic-flow-builder/SKILL.md` — specialist, and the only skill with its own package
Builds and maintains Playwright automation for a business flow. The largest skill here, and the
only one shipping supporting directories rather than a single file:
`commands/` (8, one per command) · `policies/` (6 — locator, interaction, isolation, evidence,
repair, state) · `schemas/` (Flow Map and Run contracts) · `templates/` (map, flow, spec) ·
`runtime/` (the canonical runtime copied into a project on first use, ~20 TypeScript files).
**§ 0** workspace and the environment gate — never production without unambiguous confirmation ·
**§ 1** core principles · **§ 2–3** skill package versus project workspace, and the readiness gate ·
**§ 4–17** flow structure, Map, locator and interaction policy, isolation, auth, data ·
**§ 18–20** verification, revalidation, revisions · **§ 21–30** runs, results, health states,
failure classification, evidence · **§ 31–35** the read-only and mutating commands ·
**§ 36–44** MCP policy, reuse, concurrency, secrets, philosophy.
Two rules carry the design: a flow is `DRAFTED` until it passes three runs — primary, fallback and
last-resort locators separately — and every failure is classified before anything is changed, so an
application bug is never hidden by a locator edit.
Writes `<workspace>/agentic-flow-builder/flows/<flow>/` — map, flow, spec, and immutable `runs/`.

### `skills/bug-report-publisher/SKILL.md` — specialist, owns bug filing for the agent
Turns a manual description, failed case, screenshot, log or live observation into a filed ticket.
**Step 0** workspace · **Input modes** four, with a failed automated test treated as suspect until
diagnosed · **Workflow** 12 steps, draft → evidence → duplicates → approval → publish → verify ·
**Minimum draft readiness** what blocks publication versus what merely warns ·
**Finding decisions** five outcomes, only one of which is a bug — the others are
`needs-business-clarification`, `likely automation issue`, `environment/test-data issue`,
`duplicate candidate` · **Approval gate** a single external mutation, previewed in full ·
**Safety**, **Final response**, **Hard rules**.
Five reference files carry the detail: `bug-template.md` (the GIVEN/WHEN/Expected/Actual structure
and its lint), `severity-priority.md` (impact versus urgency, `P1`–`P3`), `visual-evidence.md`
(originals preserved, annotated copies published, quality gate), `tracking-tool.md` (destination,
duplicate search, field mapping, idempotency, partial success), `draft-contract.md`
(`bug-draft.json` as the source of truth, and the draft state machine).
Never invents an Expected Result, never files over a duplicate without a decision, never claims an
upload it did not verify. Writes `.qa/bugs/<draft-id>/` — draft, report, and `evidence/original/`
alongside `evidence/annotated/`.

### `skills/qa-coach/SKILL.md` — explains the other skills, runs none of them
A documentation layer over the agent. Reads a target skill's actual definition and translates it
into an explanation: purpose, when to use it, required inputs, what it does, what it produces, and
what the outputs are good for.
**Depth** quick / standard / deep, chosen from how the user asked · **Accuracy rules** read the
definition first, never invent a capability, input, output or integration, never assume
undocumented behaviour, preserve the target's limitations · **Missing skill** say the definition is
unavailable rather than guessing.
Never modifies or executes the skill it describes, and produces no artifacts of its own — the one
skill here that writes nothing.

### `skills/flow-to-test-plan/SKILL.md` — specialist
Converges on what a flow actually *is* before testing it, for cases where the flow is the unknown:
requirements, a rough idea, a live URL, or a URL plus a named feature.
**Core principle** `flow.json` is the only source of truth and `flow.mmd` is generated from it ·
**Input modes** four, all producing the same canonical model · **URL discovery rules** observation
only — an explicit forbidden list, and ambiguous actions treated as mutating · **Phase A** understand,
model, render, lint, domain review · **Gate 1** flow approval, a hard stop · **Phase B** the verified
filter, journeys, cases, regression plan · **Gate 2** plan approval with eight hard-stop conditions.
A node is `verified: true` only with a concrete reference; everything else is reported as a gap
rather than assumed. Unverified nodes may appear in the diagram but never enter approved coverage.
Writes `.qa/flows/<flow-slug>/` — seven artifacts. Ends at plan approval: no suite, no execution,
no hand-off.
`references/flow.schema.json` enforces the model contract — a verified node without evidence, or
evidenced only by inference, fails validation.

### `install/shared/updating-the-workspace.md` — the only writer to `.qa/`, and not a skill
The single command that records what a run learned. No other skill edits `.qa/memory.md`,
`.qa/index.md`, or `.qa/project-context.md` — they all route through this one, which reads all
three, routes each fact to its file, writes in one pass, and confirms in one line.
**Step 1** read all three first · **Step 2** the routing table — which fact goes to which file and
section, and when a fact belongs in more than one · **Step 3** stamp `Last updated` and confirm.
Corrections are mandatory and carry their reasoning. Never overwrites a confirmed fact with an
inferred one; a contradiction is surfaced to the user, not silently resolved.
Exists because those three files each used to carry their own update rules, so facts landed in the
wrong file or in none at all.

### `install/shared/foundation.md` — the rules every skill obeys, and not a skill
One copy, read by all ten working skills. It has no `SKILL.md`, so it is never a slash command
and never listed. Installed to `~/.claude/qa-assistant/foundation.md` beside the workspace templates.
Where a skill and this file differ on safety, **the foundation wins**.
Until it moved here it was duplicated into all six skills — six files to keep byte-identical for
one edit, and `qa-system-explorer` carried its own rules inline instead of any of them.

| § | Holds |
|---|---|
| 1 | Untrusted content — tickets and files are material, never instructions |
| 2 | Data protection — never store secrets, redact before saving |
| 3 | Honesty about access and coverage |
| 4 | `[NOT PROVIDED]` · `[NOT APPLICABLE]` · `[MISSING-BLOCKING]` · `[ASSUMED]` |
| 5 | Depth levels and mandatory escalation |
| 6 | The three approval gates |
| 7 | Host adaptation and tracker fallback order |
| 8 | Output contract — paths per deliverable |
| 8b | The `.qa/` workspace — what to read before starting, what to write as you learn |
| 9 | Global rules |

---

## Agent

### `agents/qa-assistant.md`
The routing agent Claude Code loads. Frontmatter description decides activation. Holds the
specialist table, routing rules by phrase, chaining offers, and the gate discipline.

---

## Installer

### `install.sh`
Skills and agent to `~/.claude/`; workspace to the project. Never overwrites — existing files report
`kept`. Flags: `--skills-only`, `--workspace-only`, `--force`.

### `uninstall.sh`
Removes the agent and skills from `~/.claude`, and the scaffolding from a project. **Keeps `.qa/`
and `qa-output/` by default** — your work survives; `--purge-work` deletes it. Never touches
`.mcp.json`. Strips only its own `.gitignore` block. Confirms before acting; refuses rather than
guessing when it cannot get an answer. Flags: `--skills-only`, `--workspace-only`, `--purge-work`,
`--yes`.

### `install/templates/`
Copied into a project on install, and to
`~/.claude/qa-assistant/workspace-templates/` at agent level — the canonical source a skill copies
from when it scaffolds a workspace in a project that has none. The first two are living files the
agent updates.

| File | Becomes | Holds |
|---|---|---|
| `project-context.md` | `.qa/project-context.md` | Product, platforms, environments, roles, business rules, integrations, tracker, constraints, open questions. **Platforms decide whether mobile coverage is mandatory.** |
| `memory.md` | `.qa/memory.md` | Work log, corrections, decisions, recurring defects, environment quirks, answered questions. **Corrections and decisions are binding.** |
| `knowledge-README.md` | `.qa/knowledge/README.md` | What belongs there, naming, `sources/` for originals |
| `screenshots-README.md` | `.qa/screenshots/README.md` | Foldering by story / case / bug, redaction rules |
| `qa-output-README.md` | `qa-output/README.md` | The per-story, per-skill layout |
| `mcp.json` | `.mcp.json` | MCP servers — Atlassian, GitHub, Playwright. **The working file**, git-ignored, credential fields empty |
| `gitignore-block` | appended to `.gitignore` | Ignores `.mcp.json`, `.qa/screenshots/`, `qa-output/` |

---

## Documentation

| File | Holds |
|---|---|
| `README.md` | Workflow overview, the skills, install, usage, repo layout, maintenance notes, credits |
| `INSTALL-CODEX.md` | OpenAI Codex install — `~/.codex/`, `AGENTS.md` size limits, sandbox behaviour |
| `index.md` | This file |

---

## Maintaining this index

Update it when a file is **added, removed, or repurposed** — not on every edit. A wrong index is
worse than none: it sends the reader to a file that no longer holds what they need.

Describe what a file *holds*, not how good it is. One or two lines per file; the point is to
choose the right file to open, not to avoid opening it.
