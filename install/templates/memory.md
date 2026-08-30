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

## How the agent updates this file

**Read this file at the start of every run**, before planning any work. Then update it:

| When | Write to |
|---|---|
| A stage completes | § 1 Work log |
| The user corrects you | § 2 Corrections — *always*, no exceptions |
| The user chooses between options | § 3 Decisions |
| The same defect appears again | § 4 Recurring defects |
| The environment behaves unexpectedly | § 5 Environment quirks |
| A `[MISSING-BLOCKING]` gap gets answered | § 6 Answered questions, and update `project-context.md` if the answer is durable |

**Rules:**

1. **Corrections are mandatory.** Being corrected and not recording it guarantees the same mistake returns.
2. **Record the reasoning, not just the outcome.** "Do not X" is weak; "Do not X because Y" transfers.
3. **Keep it short.** This file is read in full on every run — a bloated file gets skimmed, and a skimmed memory is no memory.
4. **Prune what is dead.** A quirk for an environment that no longer exists is noise; delete it.
5. **Never record secrets, personal data, or customer records.** Findings only.
6. **This file is not the deliverable.** It supports the work; the work itself lives in `qa-output/`.
