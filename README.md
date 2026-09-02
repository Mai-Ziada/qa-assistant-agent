# QA Assistant

A Senior Business Analyst and QA Architect agent for Claude Code and Codex.

It takes an idea or user story from any tracking tool, file, or copy-paste and drives the full
quality workflow — story analysis, test-case generation, and execution — behind three human
approval gates.

## Quick start

```bash
git clone https://github.com/Mai-Ziada/qa-assistant-agent.git ~/qa-assistant-agent
cd /path/to/your/project
bash ~/qa-assistant-agent/install.sh
```

Then restart the session and run `/qa-assistant`.

> Clone it wherever you like — `~/qa-assistant-agent` is just the path the rest of this README
> uses. The installer works out its own location, so it can be run from anywhere.

It installs into **every host on your machine** — `~/.claude` and `~/.codex` — and scaffolds a `.qa/`
workspace in the project you ran it from. [Install](#install) covers what lands where.

## Use

Start at the entry point — it shows all six modes and routes you:

```
/qa-assistant
```

Or go straight to a mode — each works standalone:

```
/qa-story-review   /qa-create-tc       /qa-run-tc
/api-testing       /Smart_ReTest       /qa-system-explorer
```

You can also attach the work to the entry point and skip the menu:

```
/qa-assistant review KAN-42
/qa-assistant <paste a story>
```

Given a story with no stated intent, it defaults to Story Review and says so in one correctable
line. It only shows the menu when the intent is genuinely ambiguous.

> **Note on `@`:** in Claude Code the `@` prefix attaches *files*, not agents — typing
> `@qa-assistant` searches for a file by that name and finds nothing. Use `/qa-assistant`, or just
> name the agent in a sentence ("use qa-assistant to review this story").

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

Artifacts land in `./qa-output/<STORY-ID>/<skill-name>/` and carry across stages, sessions, and
hosts — stop after the analysis today, pick up test cases tomorrow. One story's whole trail sits in
one folder:

```
qa-output/
  US1/
    qa-story-review/   analysis.md
    qa-create-tc/      testcases.md  testcases.csv
    qa-run-tc/         run-2026-08-27.md
  US2/
    ...
```

---

## Recording what was learned

One shared procedure writes to the workspace, and **it is not a skill** — it has no `SKILL.md`, so
it is never a slash command and never appears in the skill list. No skill edits `.qa/memory.md`,
`.qa/index.md`, or `.qa/project-context.md` directly; they all read and follow
`~/.claude/qa-assistant/updating-the-workspace.md` instead.

```
updating-the-workspace.md  ─▶  memory.md           work log · corrections · decisions
                           ─▶  index.md            stories · deliverables · evidence
                           ─▶  project-context.md  platforms · rules · roles · envs
                               ▲ one pass, every file, one-line confirmation
```

Each of those three files used to carry its own update rules, and every skill decided on its own
which to touch — three rulebooks for one action, so facts landed in the wrong file or in none at
all. One command now owns all three.

Call it in the turn the thing happens, not at the end of a session:

| When | Lands in |
|---|---|
| A stage completes | Work log |
| **The user corrects the agent** | Corrections — *always, no exceptions* |
| A decision is settled, or a blocking gap answered | Decisions · Answered questions · Project context |
| A deliverable, report, or screenshot set is written | Deliverables · Stories · Evidence |
| A durable fact about the product or environment surfaces | Project context |

A fact can route to more than one file — an answered blocking gap is both a memory entry and a
durable project fact, so it is written to both.

Ask for it in plain language in any language — "update", "save this", "record that", "حدّث",
"سجّل" — and the agent follows the procedure. There is no command to type.

> **Not to be confused with [Update](#update)**, which upgrades your *installed copy of the agent*
> from this repo. This records QA findings into a project's workspace; `Update` pulls new skills.

---

## Specialist skills

Three deeper skills handle work the core workflow deliberately keeps shallow. The agent routes to
them when the task matches, and offers them when the core stages hit their limit.

| Skill | Use when | Modes |
|---|---|---|
| **`api-testing`** | API work beyond the basic per-endpoint cases stage 2 writes | `API_SWEEP` endpoint bug-hunting · `API_JOURNEY` ordered business flows · `API_CONTRACT` live behaviour vs spec |
| **`Smart_ReTest`** | A bug needs retesting after a fix — does it hold, is nearby functionality still intact, is the dependency chain covered | Quick Retest · Deep Retest (five evidence-driven stages) |
| **`qa-system-explorer`** | There is a running system rather than a story — you need to know what it does, where it breaks, and what your real coverage is | Systematic page-by-page exploration behind an approved map |

`qa-system-explorer` starts from a **running system and a test account** rather than from a story,
so it sits outside the three-stage chain — but it is mode 6 in the `/qa-assistant` menu like every
other skill. Everything else it shares: the same `.qa/` workspace, the same gates, the same refusal
to infer a pass.

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

```bash
git clone https://github.com/Mai-Ziada/qa-assistant-agent.git
cd /path/to/your/project
bash ~/qa-assistant-agent/install.sh
```

That does two things:

**1. The agent and skills → `~/.claude/`** — installed once, shared by every project, so an update
reaches all of them.

**2. A workspace → your project** — the agent's long-term state for *this* product:

```
your-project/
  .qa/
    index.md              map of every artifact — the agent reads it instead of searching
    project-context.md    standing facts — platforms, business rules, environments, roles
    memory.md             work log, corrections, settled decisions, recurring defects
    knowledge/            source material — supplied docs, produced reports, live findings
    screenshots/          test evidence, foldered by story / test case / bug
  qa-output/              deliverables, per story, per skill
  .mcp.json               your MCP credentials (git-ignored)
  .mcp.json.example       the template, safe to commit
  .gitignore              QA Assistant block appended
```

**Other projects need no install.** The skills scaffold `.qa/` and `qa-output/` themselves the
first time they run somewhere without one, copying from the templates installed at
`~/.claude/qa-assistant/workspace-templates/`. Run `install.sh` in a project only when you want the
workspace and `.mcp.json` set up in advance — credentials are the one thing a skill never creates.

**Re-running is safe.** Existing files are never overwritten — the script reports `kept` and moves
on, so your credentials and edits survive. Pass `--force` only when you deliberately want the
templates restored.

| Flag | Effect |
|---|---|
| `--skills-only` | Install to `~/.claude` only, no project workspace |
| `--workspace-only` | Scaffold the project workspace only |
| `--force` | Overwrite existing files |

Then: put real credentials in `.mcp.json`, fill in `.qa/project-context.md`, restart the session.

## Update

```bash
bash ~/qa-assistant-agent/install.sh --update
```

One command from anywhere: `--update` pulls this repo, then installs from it. It refreshes every
host — and therefore every project at once, because the agent and skills are shared rather than
copied per project. Restart the session afterwards.

To pull and install separately, `git -C ~/qa-assistant-agent pull` then
`bash ~/qa-assistant-agent/install.sh --skills-only` does the same thing.

On Codex, re-paste the routing block into `~/.codex/AGENTS.md` if it changed — see
[INSTALL-CODEX.md](INSTALL-CODEX.md).

---

### What an update does to your work

Nothing. `--skills-only` never touches `.qa/` or `qa-output/` — see [Update](#update) for the
command itself.

The two halves of the installer behave differently on purpose:

| What | On re-run |
|---|---|
| Agent, skills, shared reference, templates → the hosts | **Always overwritten** — that is what makes it an update |
| Project workspace → `.qa/`, `qa-output/`, `.mcp.json` | **Never overwritten** unless you pass `--force` |

So an update gives you the new skills while leaving your credentials, `project-context.md`, and
`memory.md` exactly as they are. **`--force` is for deliberately restoring a workspace to blank
templates, not for updating** — you should not need it here.

`--host claude`, `--host codex`, or `--host both` targets one host explicitly; with none, every host
present is refreshed.

#### If you installed into a project instead of a host

For `.claude/skills/` in a project root rather than `~/.claude`, copy the files over directly:

```bash
REPO=~/qa-assistant-agent
cp -r "$REPO"/skills/* .claude/skills/
cp "$REPO"/agents/qa-assistant.md .claude/agents/
cp "$REPO"/install/shared/updating-the-workspace.md .claude/qa-assistant/
```

The third line matters: the skills read that file before writing to `.qa/`, and it lives outside
`skills/`, so copying `skills/*` alone leaves it behind.

---

## Uninstall

```bash
cd /path/to/your/project
bash ~/qa-assistant-agent/uninstall.sh
```

**Your work is kept by default.** It removes the agent and the seven skills from `~/.claude`, deletes
`.mcp.json.example`, and strips the QA Assistant block from `.gitignore` — leaving every other rule
in that file untouched. `.qa/` and `qa-output/` stay exactly where they are, so reinstalling later
picks up where you left off. `.mcp.json` is never touched.

It prints what it will remove and what it will keep, then asks before doing anything.

| Flag | Effect |
|---|---|
| `--skills-only` | Remove from `~/.claude` only, leave the project untouched |
| `--workspace-only` | Remove the project scaffolding only, leave `~/.claude` untouched |
| `--purge-work` | **Also delete `.qa/` and `qa-output/`** — analyses, test cases, run reports, knowledge, evidence. Cannot be undone |
| `--yes` | Skip the confirmation prompt |

To remove everything including your work:

```bash
bash ~/qa-assistant-agent/uninstall.sh --purge-work
```

### What the agent maintains for you

`index.md`, `project-context.md` and `memory.md` are **living files the agent updates as it learns** — a
business rule you state, a platform it determines, a correction you make, a decision you settle.
Every skill reads them before it starts.

That is what stops the agent asking you the same question twice, re-deriving what it already knew,
or repeating a mistake you already corrected. Keeping them in git means that context travels to
your teammates and to your next machine.

`index.md` is the lookup layer: it maps every deliverable, knowledge file, and evidence folder to
what it holds, so a session opens the one file it needs instead of sweeping the project. The repo
has its own `index.md` doing the same for the agent's machinery.

**Git-ignored by default:** `.mcp.json` (secrets), `.qa/screenshots/` (heavy, may hold sensitive
data), `qa-output/` (changes constantly). **Committed:** `project-context.md`, `memory.md`,
`knowledge/` — the knowledge worth sharing.

### Manual install

If you would rather not run the script:

```bash
cp agents/qa-assistant.md ~/.claude/agents/
cp -r skills/* ~/.claude/skills/
mkdir -p ~/.claude/qa-assistant
cp install/shared/updating-the-workspace.md ~/.claude/qa-assistant/
cp -r install/templates ~/.claude/qa-assistant/workspace-templates
```

The last three lines are the part a `cp -r skills/*` misses: the shared reference the skills read
before writing to `.qa/`, and the templates they scaffold a missing workspace from.

For a single project, use `.claude/agents/` and `.claude/skills/` in the project root instead.
The skills work without the workspace — they say once that `./install.sh` would scaffold it.

Restart the session so the agent is discovered.

## Other hosts

The method is host-agnostic. Each skill reads `references/foundation.md`, which carries adaptation
notes for Claude Code, OpenAI Codex, IDE agents (Cursor, Windsurf, Cline, Continue), and chat-only
environments with no tools at all.

### OpenAI Codex

Codex supports skills natively in the same `SKILL.md` format, so the installer handles it — the
same script and the same command as on Claude:

```bash
bash install.sh --skills-only              # every host present, Codex included
bash install.sh --host codex --skills-only # Codex only
```

The agent definition travels inside the entry-point skill at
`$CODEX_HOME/skills/qa-assistant/agents/`, because Codex has no `agents/` registry — and that is
where the skill looks for it. Its routing block goes in `~/.codex/AGENTS.md` by hand.
**See [INSTALL-CODEX.md](INSTALL-CODEX.md)** for the routing block, the 32 KiB instruction budget
that can silently drop your project instructions, and the sandbox behaviour to expect.

### Everything else

| Host | Where to put it |
|---|---|
| Claude Code | `~/.claude/agents/` and `~/.claude/skills/` |
| Codex CLI | `~/.codex/skills/` + `~/.codex/AGENTS.md` — see [INSTALL-CODEX.md](INSTALL-CODEX.md) |
| Claude Desktop / claude.ai | Paste a skill file as a Project instruction |
| Cursor | `.cursor/rules/` |
| Windsurf | `.windsurfrules` |
| Gemini CLI | `GEMINI.md` in the repo root |
| Chat with no tools | Paste the skill, then paste the story |

On hosts without file access, every deliverable is produced inline in the same structure. The three
approval gates still apply.

Deliverables use the same `qa-output/` layout on every host, so a story review started in Codex
can be finished in Claude Code without conversion.

---

## Repository layout

```
README.md                         this file
index.md                          index of every file in this repo and what it holds
install.sh                        installer — skills to ~/.claude, workspace to your project
uninstall.sh                      uninstaller — keeps your work unless --purge-work
install/shared/                   shared references — not skills, never slash commands
  updating-the-workspace.md       the only writer to .qa/ — what every stage records
install/templates/                workspace templates the installer copies
                                  (mcp.json is the working file, mcp.json.example the committed copy)
INSTALL-CODEX.md                  OpenAI Codex install guide
agents/
  qa-assistant.md                 the routing agent
skills/
  qa-assistant/                   entry point — shows the six modes and routes
    SKILL.md
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
    references/foundation.md
  Smart_ReTest/                   specialist — quick and deep bug retesting
    SKILL.md
    references/foundation.md
  qa-system-explorer/             specialist — deep system exploration of a running app
    SKILL.md
```

---

## Maintenance notes

**`foundation.md` is duplicated on purpose.** It is identical in all five skills so each can run
standalone. Keep the five copies in sync when editing.

**Every skill here is self-contained.** All seven read and write the same `.qa/` workspace, follow
the same foundation, and write to `qa-output/<STORY-ID>/<skill-name>/`. None requires a skill
outside this repository — the specialists included, so `api-testing` continues from a story's API
cases when they exist and files bugs through its own tracker rules.

---

## Credits

The two specialist skills originate from separate repositories and are vendored here so the agent
ships complete. Persona wording adapted; method and structure are the original authors' work.

| Skill | Author | Source |
|---|---|---|
| `Smart_ReTest` | Mai-Ziada | [Smart_ReTest_Skill](https://github.com/Mai-Ziada/Smart_ReTest_Skill) |
| `api-testing` | Eng-Mohammed-Samir | [API_Testing_skill](https://github.com/Eng-Mohammed-Samir/API_Testing_skill) |
