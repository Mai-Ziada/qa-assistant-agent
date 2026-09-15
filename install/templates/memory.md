# Agent Memory

> **The agent maintains this file.** Its one job is to stop the agent redoing work it already did or
> repeating a mistake it was already corrected on.
>
> `project-context.md` holds *what is true about the product*.
> This file holds *what happened during QA work and what was learned from it*.

**Last updated:** `[NOT PROVIDED]`

---

## 1. Work log — what has been done

One row per completed run, newest first. Before starting any stage, read this: the work may exist.

| Date | Story | Stage | Output | Outcome |
|---|---|---|---|---|
| | | | | |

## 2. Corrections — do not repeat these

Every time the user corrects the agent, it lands here. **Read this section before every run.**
Repeating a mistake already recorded here is the specific failure this file exists to prevent.

| # | The mistake | The correction | Applies to |
|---|---|---|---|
| C-1 | | | |

## 3. Decisions — settled, do not re-ask

Choices the user already made. Re-asking a settled question wastes their time and reads as not
listening.

| # | Question | Decision | Date |
|---|---|---|---|
| D-1 | | | |

## 4. Recurring defects

Failure patterns that showed up more than once. These raise likelihood in the `qa-create-tc`
priority calculation, and are the first thing to check in a regression pass.

| # | Pattern | Seen in | Times |
|---|---|---|---|
| R-1 | | | |

## 5. Environment quirks

Things about the test environment that cost time to discover. Recording them once saves rediscovery.

| # | Quirk | Workaround |
|---|---|---|
| E-1 | | |

## 6. Answered questions

Business answers already obtained. Prevents re-raising a gap that has been settled.

| # | Question | Answer | Source | Date |
|---|---|---|---|---|
| A-1 | | | | |

---

## Who writes here

**One shared procedure writes to this file** — never a skill editing it ad hoc, and never you
being asked the same question twice because a correction went unrecorded.

The agent reads `~/.claude/qa-assistant/updating-the-workspace.md` and follows it: that file holds
which fact belongs in which section here, and the rules that keep this file worth reading —
corrections are mandatory, record the reasoning and not just the outcome, and never record a secret
or a customer record.

**It stays short by ageing, not by hoping.** This file is read in full every run, so the agent
archives the work log once it passes 20 rows, drops quirks whose environment no longer exists, and
retires answered questions once the answer is durable in `project-context.md`. Archived rows move
to `.qa/archive/memory-<YYYY-MM>.md` — **nothing is deleted**, and the agent says what it moved.

**Corrections are the exception: they never leave.** A correction that keeps recurring gets
*promoted* into the agent's own rules instead — you will be asked first, and the row stays here
marked `promoted`, so the history survives.

**You can edit it too.** It is a plain markdown file in your repository. Anything you write here the
agent reads at the start of every run, and treats corrections and decisions as binding.

**This file is not the deliverable.** It supports the work; the work itself lives in `qa-output/`.
