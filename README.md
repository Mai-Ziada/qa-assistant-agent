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
cp -r agents/qa-assistant.md   ~/.claude/agents/
cp -r skills/qa-story-review   ~/.claude/skills/
cp -r skills/qa-create-tc      ~/.claude/skills/
cp -r skills/qa-run-tc         ~/.claude/skills/
```

For a single project, use `.claude/agents/` and `.claude/skills/` in the project root instead.

Restart the session so the agent is discovered.

### Use

```
@qa-assistant <paste a story, a ticket link, or a file path>
```

Or invoke a stage directly — each works standalone:

```
/qa-story-review     /qa-create-tc     /qa-run-tc
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
  qa-assistant.md              the routing agent
skills/
  qa-story-review/
    SKILL.md                   stage 1
    references/foundation.md   shared safety and adaptation rules
  qa-create-tc/
    SKILL.md                   stage 2
    references/foundation.md
  qa-run-tc/
    SKILL.md                   stage 3
    references/foundation.md
```

`foundation.md` is identical in all three skills — each stage must be able to run standalone. Keep
the copies in sync when editing.
