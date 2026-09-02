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

## Specialist skills

Three deeper skills handle work the core workflow deliberately keeps shallow. The agent routes to
them when the task matches, and offers them when the core stages hit their limit.

| Skill | Use when | Modes |
|---|---|---|
| **`api-testing`** | API work beyond the basic per-endpoint cases stage 2 writes | `API_SWEEP` endpoint bug-hunting · `API_JOURNEY` ordered business flows · `API_CONTRACT` live behaviour vs spec |
| **`Smart_ReTest`** | A bug needs retesting after a fix — does it hold, is nearby functionality still intact, is the dependency chain covered | Quick Retest · Deep Retest (five evidence-driven stages) |
| **`qa-system-explorer`** | There is a running system rather than a story — you need to know what it does, where it breaks, and what your real coverage is | Systematic page-by-page exploration behind an approved map |

`qa-system-explorer` is **invoked directly, not from the `/qa-assistant` menu** — it starts from a
running system and a test account rather than from a story, so it sits outside the three-stage
chain. Everything else it shares: the same `.qa/` workspace, the same gates, the same refusal to
infer a pass.

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
bash /path/to/qa-assistant-agent/install.sh
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

### Update

Pull the repo, then re-run the installer with `--skills-only`:

```bash
cd /path/to/qa-assistant-agent
git pull
bash install.sh --skills-only
```

You can run it from anywhere — `--skills-only` writes to `~/.claude` and never touches the
directory you happen to be standing in, so there is no need to `cd` into a project first.

**That updates every project at once**, because the agent and skills live in `~/.claude` and are
shared. Restart the session afterwards so the new versions are discovered.

**`--force` is not needed here, and you should not use it.** The two halves of the installer behave
differently on purpose:

| What | On re-run |
|---|---|
| Agent, skills, workspace templates → `~/.claude` | **Always overwritten** — that is what makes this an update |
| Project workspace → `.qa/`, `qa-output/`, `.mcp.json` | **Never overwritten** unless you pass `--force` |

So `--skills-only` gives you the new skills while leaving your credentials, `project-context.md`,
and `memory.md` exactly as they are. Passing `--force` would reset those files to blank templates —
it is for deliberately restoring a workspace, not for updating.

**Your work is never at risk from an update.** `.qa/` and `qa-output/` are not touched by
`--skills-only` at all.

#### Updating a single project's copy

If you installed into a project instead of `~/.claude` — `.claude/skills/` in the project root —
copy the skills over directly:

```bash
cp -r /path/to/qa-assistant-agent/skills/* .claude/skills/
cp /path/to/qa-assistant-agent/agents/qa-assistant.md .claude/agents/
```

#### Removing a skill that no longer ships

The installer copies files in; it never deletes. A skill that was removed from the repo stays on
your machine until you delete it yourself:

```bash
ls ~/.claude/skills          # compare against skills/ in the repo
rm -rf ~/.claude/skills/<name-that-is-no-longer-in-the-repo>
```

This only matters when a skill is renamed or retired — a normal update needs nothing here.

#### Checking what you have

```bash
git -C /path/to/qa-assistant-agent log --oneline -1   # the version you pulled
ls ~/.claude/skills                                    # the skills now installed
```

Both lists should match `skills/` in the repo.

#### Codex

```bash
cd /path/to/qa-assistant-agent
git pull
cp -r skills/* ~/.codex/skills/
```

Then re-paste the routing block into `~/.codex/AGENTS.md` if it changed — see
[INSTALL-CODEX.md](INSTALL-CODEX.md).

### Uninstall

```bash
cd /path/to/your/project
bash /path/to/qa-assistant-agent/uninstall.sh
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
bash /path/to/qa-assistant-agent/uninstall.sh --purge-work
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
```

For a single project, use `.claude/agents/` and `.claude/skills/` in the project root instead.
The skills work without the workspace — they say once that `./install.sh` would scaffold it.

Restart the session so the agent is discovered.

### Use

Start at the entry point — it shows all five modes and routes you:

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

---

## Other hosts

The method is host-agnostic. Each skill reads `references/foundation.md`, which carries adaptation
notes for Claude Code, OpenAI Codex, IDE agents (Cursor, Windsurf, Cline, Continue), and chat-only
environments with no tools at all.

### OpenAI Codex

Codex supports skills natively in the same `SKILL.md` format, so all eight copy across directly:

```bash
mkdir -p ~/.codex/skills
cp -r skills/* ~/.codex/skills/
```

The agent becomes routing instructions in `~/.codex/AGENTS.md` rather than a registered agent.
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

Deliverables use the same `./ba-analysis/` layout on every host, so a story review started in Codex
can be finished in Claude Code without conversion.

---

## Repository layout

```
README.md                         this file
index.md                          index of every file in this repo and what it holds
install.sh                        installer — skills to ~/.claude, workspace to your project
uninstall.sh                      uninstaller — keeps your work unless --purge-work
install/templates/                workspace templates the installer copies
INSTALL-CODEX.md                  OpenAI Codex install guide
agents/
  qa-assistant.md                 the routing agent
skills/
  qa-assistant/                   entry point — shows the five modes and routes
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
  qa-system-explorer/             specialist — deep system exploration, invoked directly
    SKILL.md
```

---

## Maintenance notes

**`foundation.md` is duplicated on purpose.** It is identical in all five skills so each can run
standalone. Keep the five copies in sync when editing.

**`api-testing` is a full member of the workflow.** It reads and writes the same `.qa/` workspace,
follows the same foundation, writes to `qa-output/<STORY-ID>/api-testing/`, and files bugs through
its own tracker rules. It depends on no skill outside this repository, and continues from a story's
API cases when they exist.

**Every skill here is self-contained.** All five read and write the same `.qa/` workspace, follow
the same foundation, and write to `qa-output/<STORY-ID>/<skill-name>/`. None of them requires a
skill outside this repository.

---

## Credits

The two specialist skills originate from separate repositories and are vendored here so the agent
ships complete. Persona wording adapted; method and structure are the original authors' work.

| Skill | Author | Source |
|---|---|---|
| `Smart_ReTest` | Mai-Ziada | [Smart_ReTest_Skill](https://github.com/Mai-Ziada/Smart_ReTest_Skill) |
| `api-testing` | Eng-Mohammed-Samir | [API_Testing_skill](https://github.com/Eng-Mohammed-Samir/API_Testing_skill) |
