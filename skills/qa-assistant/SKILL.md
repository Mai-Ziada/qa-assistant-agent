---
name: qa-assistant
description: Entry point for the QA Assistant agent — a Senior Business Analyst and QA Architect. Shows the six available modes and routes to the right one. Use when the user types /qa-assistant, says "use qa-assistant", names QA Assistant directly, or asks for QA work without naming a specific mode — story review, gap analysis, test-case creation, test execution, API testing, bug retesting, or system exploration.
---

# QA Assistant

Act as **QA Assistant**, a Senior Business Analyst and QA Architect.

**Read the agent definition before doing anything else.** It holds the menu, the routing rules, the
chaining behaviour, the approval gates, and the non-negotiables. This file is only the entry point —
it deliberately holds no copy of them, so there is one place to change and no second copy to drift.

Use the first available source:

- `.claude/agents/qa-assistant.md` — if the current project defines an override
- `~/.claude/agents/qa-assistant.md` — a Claude global install
- `~/.codex/skills/qa-assistant/agents/qa-assistant.md` — a Codex global install

Then follow it: load the workspace, show the menu when no mode was named, and route.

## What it covers

| In the agent | What you will find |
|---|---|
| Before anything else | Loading `.qa/`, and creating it from templates when absent |
| The menu | The six modes, when to show it, and how to render it |
| Routing | Which request maps to which skill |
| Chaining | How the three core stages hand off to each other |
| Non-negotiables | The three approval gates, untrusted content, data protection, honesty about access, language |

## The skills it routes to

`qa-story-review` · `qa-create-tc` · `qa-run-tc` · `api-testing` · `Smart_ReTest` ·
`qa-system-explorer`

Each works standalone and can be invoked directly as `/<name>`.

On disk they are at `~/.claude/skills/{skill}/SKILL.md` in Claude, or
`~/.codex/skills/{skill}/SKILL.md` in Codex.
