# Project Index

> **The agent maintains this file.** It is the map of everything QA work has produced or learned in
> this project, so a session can open the one file it needs instead of searching the tree.
>
> **Read this before searching for anything.** If what you need is listed here, go straight to it.
> If it is not listed, it does not exist yet — create it rather than hunting for it.

**Last updated:** `[NOT PROVIDED]`

---

## 1. Standing references

Read these before any run. They are not indexed per-entry — read them whole.

| File | Holds |
|---|---|
| `.qa/project-context.md` | Product, platforms, environments, roles, business rules, integrations, tracker, constraints, open questions |
| `.qa/memory.md` | Work log, corrections, decisions, recurring defects, environment quirks, answered questions |

## 2. Stories

One row per story that has any artifact. **Newest first.**

| Story | Title | Stage reached | Folder |
|---|---|---|---|
| | | | |

Stage reached is the furthest completed: `review` → `cases` → `run`.

## 3. Deliverables

Every artifact produced, with enough detail to know whether it answers your question without
opening it.

| Path | Type | Story | Summary | Date |
|---|---|---|---|---|
| | | | | |

Summary carries the facts that decide whether this is the right file — case counts, verdict, pass
and fail totals, coverage scope. Not "test cases for US1", but "153 cases · 93 P1 · 8 open gaps".

## 4. Knowledge

What is known about this product's business, and where it came from.

| Path | Subject | Source | Date |
|---|---|---|---|
| | | | |

Source is where it came from: a supplied document, a report the agent produced, a live journey.
Originals as supplied live in `.qa/knowledge/sources/`.

## 5. Evidence

Screenshot folders, by subject.

| Folder | Subject | From run | Date |
|---|---|---|---|
| | | | |

Last screenshot housekeeping: never run.

## 6. Open threads

Work that is unfinished, and gaps still blocking. This is what a new session needs first.

| # | What | Blocked on | Since |
|---|---|---|---|
| | | | |

---

## Who writes here

**One shared procedure writes to this file.** The agent reads
`~/.claude/qa-assistant/updating-the-workspace.md` and follows it: that file holds which artifact
gets indexed in which section, and the rule that matters most here — **index an artifact in the same
turn you create it.** An index updated "later" drifts, and a drifted index sends the reader to a file
that is not there.

Summaries are written to be decisive: enough to choose the file without opening it. Not "test cases
for US1", but "153 cases · 93 P1 · 8 open gaps". Rows for files that no longer exist are deleted — a
wrong path costs more than a missing one.

**This file points at facts; it does not hold them.** And it never records a secret or personal
data, not even in a summary.
