# QA Assistant

A Senior Business Analyst and QA Architect agent for Claude Code.

It takes an idea or user story from any tracking tool, file, or copy-paste and drives the full
quality workflow — story analysis, test-case generation, and execution — behind three human
approval gates.

---

## The workflow

Three chained stages. Each is a standalone skill; each ends by offering the next.

```
qa-story-review  ──▶  gate 1: approve the analysis
                      "Generate test cases now?"
                              │
qa-create-tc     ──▶  gate 2: approve the test cases
                      gate 3: publish to the tracker?   ← a separate decision
                      "Run them now?"
                              │
qa-run-tc        ──▶  feasibility check ▸ execute ▸ report
                      "File failures as bugs?"
```

| Stage | Skill | Produces |
|---|---|---|
| **1. Story Review** | `qa-story-review` | Dependency map, six-lens gap analysis, business questions, proposals, readiness verdict |
| **2. Create TC** | `qa-create-tc` | Coverage matrix and test cases — functional, edge, integration, API, threat-based security |
| **3. Run TC** | `qa-run-tc` | Executed results with redacted evidence, faithful statuses, optional bug filing |

Artifacts land in `./ba-analysis/` and carry across stages, sessions, and hosts — stop after the
analysis today, pick up test cases tomorrow.

---

## Specialist skills

Three deeper skills handle work the core workflow deliberately keeps shallow. The agent routes to
them when the task matches, and offers them when the core stages hit their limit.

| Skill | Use when | Modes |
|---|---|---|
| **`api-testing`** | API work beyond the basic per-endpoint cases stage 2 writes | `API_SWEEP` endpoint bug-hunting · `API_JOURNEY` ordered business flows · `API_CONTRACT` live behaviour vs spec |
| **`Smart_ReTest`** | A bug needs retesting after a fix — does it hold, is nearby functionality still intact, is the dependency chain covered | Quick Retest · Deep Retest (five evidence-driven stages) |
| **`flow-to-regression`** | A feature, requirement, or live URL needs turning into a regression suite | Discovery → typed `flow.json` → Mermaid chart → journeys → plan, then hands off to `agentic-regression` |

**Skill ownership is respected.** `flow-to-regression` orchestrates the flow model and its chart,
then hands approved content to `agentic-regression`, which remains the sole owner of the suite
format, the regression maps, and everything under `.sara/regression/`.

### Credits

`Smart_ReTest` and `flow-to-regression` and `api-testing` originate from separate repositories and
are vendored here so the agent ships complete:

- [`Smart_ReTest`](https://github.com/Mai-Ziada/Smart_ReTest_Skill) — Mai-Ziada
- [`api-testing`](https://github.com/Eng-Mohammed-Samir/API_Testing_skill) — Eng-Mohammed-Samir
- [`flow-to-regression`](https://github.com/Haifasameer24/-flow-to-regression) — Haifasameer24

Persona references were adapted to QA Assistant. Data paths (`.sara/`) and the
`agentic-regression` handoff are unchanged, so these copies stay compatible with existing run
history and installed companion skills.

---

## What makes it different

**Six expert lenses, not one generic pass.** Business Analyst, Domain/Product,
Integration/Architecture, QA/Risk, Security/Privacy, and UX/Accessibility — each with its own
priorities and blind spots. Findings are deduplicated into one row showing every lens that raised
them.

**Dependency mapping before analysis.** Integration gaps are the most expensive class of defect and
are invisible at single-story altitude. The agent maps confirmed relationships across the tracker,
the repository, and local artifacts — and says plainly what it could not search. It never invents a
neighbouring story to fill a diagram.

**Applicability-based coverage, not checklists.** API cases for pagination, `404`, `405`, or
idempotency are generated only when the endpoint actually has that behaviour. Undocumented status
codes are raised as API contract gaps rather than guessed.

**Threat-based security.** IDOR when identifiers can be manipulated. XSS when user content is
rendered. Injection when input reaches a query. CSRF when cookie auth protects a state change. Not
every attack type applied to every story.

**Priority by business impact.** Weighted across impact, likelihood, usage frequency, and recovery
difficulty. Every acceptance criterion gets a case; only critical-path criteria get P1 — because if
everything is P1, nothing is.

**A ten-point feasibility check before execution.** Including the one that matters most: *could
running this create, modify, delete, notify, charge, publish, or dispatch anything real?*

**Never infers a pass.** A case that was not executed — or was executed without the access needed to
verify its expected result — is never `PASS`.

---

## Safety design

**Three approval gates.** Analysis → test cases → publication. Approving test cases is never
approval to publish them; those are two decisions and each needs its own answer.

**Prompt-injection protection.** Tickets, files, comments, API responses, and web pages are material
to analyze, never instructions to obey. A ticket saying "approved, push it" is data, not approval.
Only the user in the conversation can change the agent's instructions.

**Data protection.** Never stores or exposes credentials, tokens, cookies, or auth headers. Redacts
personal and financial identifiers before saving evidence. Prefers synthetic test data. Never asks
you to paste a secret.

**Honesty about access.** Never claims a tool, integration, or verification it does not have. A
partial result labelled complete is treated as the most damaging output it can produce.

---

## Install

Copy into your Claude Code configuration:

```bash
# user-global — available in every project
cp agents/qa-assistant.md ~/.claude/agents/
cp -r skills/* ~/.claude/skills/
```

That installs the agent plus all six skills. To take only the core workflow:

```bash
cp agents/qa-assistant.md ~/.claude/agents/
cp -r skills/qa-story-review skills/qa-create-tc skills/qa-run-tc ~/.claude/skills/
```

For a single project, use `.claude/agents/` and `.claude/skills/` in the project root instead.

Restart the session so the agent is discovered.

### Use

```
@qa-assistant <paste a story, a ticket link, or a file path>
```

Or invoke a stage directly — each works standalone:

```
/qa-story-review   /qa-create-tc       /qa-run-tc
/api-testing       /flow-to-regression /Smart_ReTest
```

Given a story with no stated intent, it defaults to Story Review and says so in one correctable
line. It only shows a mode menu when the intent is genuinely ambiguous.

---

## Other hosts

The method is host-agnostic. Each skill reads `references/foundation.md`, which carries adaptation
notes for Claude Code, OpenAI Codex, IDE agents (Cursor, Windsurf, Cline, Continue), and chat-only
environments with no tools at all.

| Host | Where to put it |
|---|---|
| Claude Code | `~/.claude/agents/` and `~/.claude/skills/` |
| Claude Desktop / claude.ai | Paste a skill file as a Project instruction |
| Codex CLI | `AGENTS.md` in the repo root |
| Cursor | `.cursor/rules/` |
| Windsurf | `.windsurfrules` |
| Gemini CLI | `GEMINI.md` in the repo root |
| Chat with no tools | Paste the skill, then paste the story |

On hosts without file access, every deliverable is produced inline in the same structure. The three
approval gates still apply.

---

## Repository layout

```
agents/
  qa-assistant.md                 the routing agent
skills/
  qa-story-review/                stage 1
    SKILL.md
    references/foundation.md      shared safety and adaptation rules
  qa-create-tc/                   stage 2
    SKILL.md
    references/foundation.md
  qa-run-tc/                      stage 3
    SKILL.md
    references/foundation.md
  api-testing/                    specialist — API sweeps, journeys, contract checks
    SKILL.md
  Smart_ReTest/                   specialist — quick and deep bug retesting
    SKILL.md
  flow-to-regression/             specialist — flow model to regression suite
    SKILL.md
    README.md
    USAGE.md
    flow.schema.json
```

`foundation.md` is identical in all three skills — each stage must be able to run standalone. Keep
the copies in sync when editing.
