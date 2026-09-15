# Updating the workspace

> **Shared reference, not a skill.** It has no `SKILL.md`, so it is never a slash command and
> never appears in the skill list. Every QA skill reads it before writing to `.qa/`.

> Installed at `~/.claude/qa-assistant/updating-the-workspace.md`. In the repo:
> `install/shared/updating-the-workspace.md` — one copy, no duplicates to keep in sync.

This is the **only** procedure that writes to the QA workspace. No skill edits `.qa/memory.md`,
`.qa/index.md`, or `.qa/project-context.md` directly — they all follow this instead.

**Why it exists:** those three files each carried their own "How the agent updates this file"
rules, and every skill decided on its own which to touch. Three rulebooks for one action meant
things landed in the wrong file, or in no file at all. One command, one pass, one place to fix.

---

## The one rule

**Take what the run learned, route each fact to its file, write them all in a single pass, then say in
one line what you recorded.**

Never write to one file and leave the others stale — that is the drift this command exists to
prevent. If a fact belongs in two files, it goes in both.

---

## Step 1 — Read all three, always

Read them together before writing anything. You are amending a live record, not starting fresh, and
you cannot route a fact correctly without knowing what is already there.

```bash
cat .qa/memory.md .qa/index.md .qa/project-context.md
```

If `.qa/` does not exist, create the workspace first (see the qa-assistant agent's workspace
section) and then continue.

## Step 2 — Route every fact

| What you learned | Goes to |
|---|---|
| A stage completed | `memory.md` § 1 Work log |
| **The user corrected you** | `memory.md` § 2 Corrections — *always, no exceptions* |
| The user chose between options | `memory.md` § 3 Decisions |
| The same defect appeared again | `memory.md` § 4 Recurring defects |
| The environment behaved unexpectedly | `memory.md` § 5 Environment quirks |
| A blocking gap got answered | `memory.md` § 6 Answered questions — **and** `project-context.md` if durable |
| A deliverable was written | `index.md` § 3 Deliverables — **and** § 2 Stories if the stage advanced |
| A document was supplied or a report produced | `index.md` § 4 Knowledge |
| Screenshots were captured | `index.md` § 5 Evidence |
| Work ended unfinished, or a gap still blocks | `index.md` § 6 Open threads |
| A gap closed or work completed | Remove the row from `index.md` § 6 |
| A file was deleted or replaced | Remove or update its row in `index.md` |
| A durable fact about the product, platforms, environments, roles, business rules, integrations, tracker, or constraints | `project-context.md`, in its section |
| A question asked but still unanswered | `project-context.md` § 9 Open questions |
| A system-wide test-data fact (an account, a card, a seed record, a reference or known-invalid value, …) | `test-data/<category>.md` — find the matching category file, or create one named for what it holds if none exists yet |
| A test-data fact that belongs to one story only (an uploaded file, an attachment, a value that will not apply anywhere else) | `test-data/<STORY-FOLDER>/` — create the folder if this is the first for that story |

**A fact can route to more than one file.** An answered blocking gap is both a `memory.md` answered
question and a `project-context.md` durable fact. Write both.

**A test-data fact is read and written narrowly, not swept.** Unlike the three files above, open
only the specific category file or story folder the fact belongs to — never every file under
`test-data/`. `.qa/index.md` tells you what already exists there.

## Step 3 — Stamp and confirm

Set `**Last updated:**` to today's date in every file you touched. Then report in one line:

> Recorded: 1 correction (C-2), 1 deliverable, story KAN-42 advanced to `cases`.

---

## Non-negotiables

**Corrections are mandatory.** Being corrected and not recording it guarantees the same mistake
returns — that is the single failure this whole workspace exists to prevent. Record the reasoning,
not just the outcome: "Do not X" is weak; "Do not X because Y" transfers to the next situation.

**Never overwrite a confirmed fact with an inferred one.** A fact the user stated outranks anything
you deduced.

**Contradiction is a finding, not a silent overwrite.** When a new fact contradicts a recorded one,
surface both to the user and let them settle it.

**`[NOT PROVIDED]` is a truthful answer.** Never guess a value into `project-context.md`.

**Keep it short.** These files are read in full at the start of every run. A bloated file gets
skimmed, and a skimmed memory is no memory. Prune what is dead — a quirk for an environment that no
longer exists is noise.

**Never record secrets or personal data** — not credentials, tokens, customer records, or financial
identifiers. Not even in a summary. Record where a credential lives, never its value.

**Index in the same turn you create the artifact.** An index updated "later" drifts, and a drifted
index sends the reader to a file that is not there.

**Summaries must be decisive** — enough to choose the file without opening it. Not "test cases for
US1", but "153 cases · 93 P1 · 8 open gaps".

**These files are not the deliverable.** They support the work; the work itself lives in `qa-output/`.
