# flow-to-regression

A **Sara** QA skill that orchestrates a feature idea, a set of requirements, or a live URL into a
complete regression workflow — end to end.

It discovers and builds a typed flow model (`flow.json`), renders it as a Mermaid chart, pauses for
**chart approval**, derives journeys / test cases / a regression plan, pauses for **plan approval**,
then automatically invokes the `agentic-regression` skill to generate the suite and report a summary.

```
Discovery → flow.json → Mermaid chart → GATE 1 (chart approval)
→ Journeys → Test Cases → Regression Plan → GATE 2 (plan approval)
→ invoke agentic-regression → Regression Suite generated → Suite Summary
```

`flow.json` is the source of truth; the Mermaid chart is only a view. Unverified nodes never enter
journeys, test cases, the plan, or the suite. `agentic-regression` still owns the suite format and maps.

---

## Contents

| File | Purpose |
|---|---|
| `skill.md` | The skill definition (frontmatter + instructions) Sara/Claude loads. |
| `flow.schema.json` | JSON Schema for the `flow.json` typed flow model. |
| `USAGE.md` | Practical, day-to-day usage guide. |

---

## Installation

This skill is loaded from your Claude skills directory: `~/.claude/skills/<skill-name>/`.
A skill folder must contain a `SKILL.md` file (note: uppercase) plus its assets.

### 1. Clone the repo

```bash
git clone https://github.com/Haifasameer24/-flow-to-regression.git
cd -flow-to-regression
```

### 2. Link it into your Claude skills directory

**Option A — symlink (recommended; stays up to date with `git pull`):**

```bash
# macOS / Linux / Git Bash on Windows
mkdir -p ~/.claude/skills/flow-to-regression
ln -s "$(pwd)/skill.md"         ~/.claude/skills/flow-to-regression/SKILL.md
ln -s "$(pwd)/flow.schema.json" ~/.claude/skills/flow-to-regression/flow.schema.json
```

> On Windows, creating symlinks may require Developer Mode enabled, or run the shell as
> Administrator. If symlinks aren't available, use Option B.

**Option B — copy (simplest):**

```bash
mkdir -p ~/.claude/skills/flow-to-regression
cp skill.md         ~/.claude/skills/flow-to-regression/SKILL.md
cp flow.schema.json ~/.claude/skills/flow-to-regression/flow.schema.json
```

### 3. Verify

Start a new Claude Code / Sara session and confirm `flow-to-regression` appears in the available
skills list. Then invoke it (e.g. `/flow-to-regression`) on any project.

### Updating

```bash
cd -flow-to-regression
git pull
```

With the symlink option (A), the update is live immediately. With the copy option (B), re-run the
copy commands from step 2.

---

## Usage

See [`USAGE.md`](USAGE.md) for the full guide — when to use it, recommended workflows, the two
approval gates, and how it fits relative to the other Sara skills (SWEEP, story-test, journey-test,
agentic-regression).

It is a **structuring and orchestration** skill: it builds the scaffold the execution skills run on.
It does **not** find bugs and does **not** mutate the app — it only observes during discovery.
