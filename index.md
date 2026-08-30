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
| The rules every skill obeys — safety, gates, depth, workspace, output paths | `skills/*/references/foundation.md` § 1–9 |
| How a story is analysed and scored | `skills/qa-story-review/SKILL.md` |
| How test cases are derived and prioritised | `skills/qa-create-tc/SKILL.md` |
| How cases are executed and reported | `skills/qa-run-tc/SKILL.md` |
| API sweeps, journeys, contract checks | `skills/api-testing/SKILL.md` |
| Retesting a bug after a fix | `skills/Smart_ReTest/SKILL.md` |
| Which skill handles a request | `skills/qa-assistant/SKILL.md` § Step 2, or `agents/qa-assistant.md` |
| What the workspace files are for | `install/templates/` |
| How installation works | `install.sh`, `README.md` § Install |
| How a missing `.qa/` gets created | `skills/*/references/foundation.md` § 8b, Create it when it is missing |
| How removal works, and what survives it | `uninstall.sh`, `README.md` § Uninstall |

---

## Skills

Each skill is one `SKILL.md` with YAML frontmatter (`name`, `description`) that decides when it
activates. The five working skills each carry an identical `references/foundation.md`.

### `skills/qa-assistant/SKILL.md`
Entry point. Shows the five modes and routes to one. **Step 1** menu · **Step 2** routing table
mapping numbers and phrases to skills · **Step 3** chaining rules. Routes rather than works.

### `skills/qa-story-review/SKILL.md` — stage 1
Analyse a story before anything is built.
**Step 1** ingest · **Step 2** dependency mapping · **Step 3** expert review lenses ·
**Step 4** the report, including a design-versus-story review and a scored readiness verdict ·
**Step 5** approval gate 1 · **Step 6** chain to test cases.
Under 70% readiness holds test-case generation until the gaps are closed.
Writes `qa-output/<STORY-ID>/qa-story-review/analysis.md`.

### `skills/qa-create-tc/SKILL.md` — stage 2
Generate test cases from a story or an approved analysis.
**Step 1** coverage by category — functional positive and negative, edge, integration, API, UI/UX,
security, with mobile lifecycle folded in for mobile stories ·
**Step 1b** the derivation sweep: every stated rule owes its violation, every technique owes all its
targets, every raised gap owes the case that catches it ·
**Step 2** priority by business impact · **Step 3** case format · **Step 4** deliverables ·
**Steps 5–6** two separate gates — approving cases is not approval to publish.
Writes `qa-output/<STORY-ID>/qa-create-tc/testcases.md`.

### `skills/qa-run-tc/SKILL.md` — stage 3
Execute cases against a real environment.
**Step 1** a ten-point feasibility check that runs before any case ·
**Step 3** execution · **Step 4** the report · **Step 5** optional bug filing behind a confirmation.
Never infers a pass; unobserved is never `PASS`.
Writes `qa-output/<STORY-ID>/qa-run-tc/run-<date>.md`, evidence in `.qa/screenshots/`.

### `skills/api-testing/SKILL.md` — specialist
Three modes: `API_SWEEP` endpoint bug-hunting · `API_JOURNEY` ordered business flows ·
`API_CONTRACT` live behaviour versus documented spec.
**Phase 1** intake · **URL Source Protocol** · **Shared Execution Rules** · a section per mode ·
**Tracker Filing Rules**. Continues from a story's API cases when they exist.
Writes `qa-output/<STORY-ID>/api-testing/`.

### `skills/Smart_ReTest/SKILL.md` — specialist
Retest a bug after a fix. **Quick Retest** — verify, update status, comment.
**Deep Retest** — five evidence-driven stages: readiness gate, original retest, deep sanity,
mapped-bug dependency chain, final decision. Verifies UI and persisted data agree.
Writes `qa-output/<BUG-ID>/Smart_ReTest/`.

### `skills/*/references/foundation.md` — shared, five identical copies
The rules every skill obeys. Duplicated so each skill runs standalone; **keep all five in sync**.

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
| `mcp.json.example` | `.mcp.json` | MCP server template — Atlassian, GitHub, Playwright |
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
