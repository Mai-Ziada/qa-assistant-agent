# Project Context

> **The agent maintains this file.** It is the standing reference every QA skill reads before it
> starts, so a new session does not re-ask what an earlier one was already told.
>
> Record only what stays true across stories — the system, its rules, its environments, its people.
> Anything specific to one story belongs in that story's folder under `qa-output/`.
>
> `[NOT PROVIDED]` is a truthful answer. Never guess a value into this file.

**Last updated:** `[NOT PROVIDED]`

---

## 1. The product

| | |
|---|---|
| **Product** | `[NOT PROVIDED]` |
| **What it does** | `[NOT PROVIDED]` |
| **Who uses it** | `[NOT PROVIDED]` |
| **Business model** | `[NOT PROVIDED]` |

## 2. Platforms

| Platform | Applies | Notes |
|---|---|---|
| Web | `[NOT PROVIDED]` | |
| Mobile — iOS | `[NOT PROVIDED]` | |
| Mobile — Android | `[NOT PROVIDED]` | |
| Backend / API | `[NOT PROVIDED]` | |
| Admin panel | `[NOT PROVIDED]` | |

> This table decides whether mobile lifecycle coverage is mandatory in `qa-create-tc`. Keep it accurate.

## 3. Environments

| Environment | URL / package | Credentials live in | Safe to test |
|---|---|---|---|
| Staging | `[NOT PROVIDED]` | `[NOT PROVIDED]` | `[NOT PROVIDED]` |
| Production | `[NOT PROVIDED]` | — | **No** unless the user says otherwise, in writing, per run |

**Never store a credential value here.** Record where it lives — an env var name, a vault path.

## 4. Roles and permissions

| Role | Can do | Cannot do |
|---|---|---|
| `[NOT PROVIDED]` | | |

## 5. Business rules that hold across stories

Rules the whole system obeys — currency, rounding, tax, cancellation windows, refund policy, SLAs.
Each rule owes a test case somewhere; that is what makes this section worth keeping.

| # | Rule | Source | Confirmed by |
|---|---|---|---|
| BR-1 | `[NOT PROVIDED]` | | |

## 6. Integrations

| System | Direction | What flows | Notes |
|---|---|---|---|
| `[NOT PROVIDED]` | | | |

## 7. Tracker and tooling

| | |
|---|---|
| **Issue tracker** | `[NOT PROVIDED]` |
| **Project / board** | `[NOT PROVIDED]` |
| **Story id format** | `[NOT PROVIDED]` |
| **Bug template** | `[NOT PROVIDED]` |
| **Test management** | `[NOT PROVIDED]` |

## 8. Known constraints

Things that limit testing: no DB access, no admin account, payment sandbox only, rate limits.

- `[NOT PROVIDED]`

## 9. Open questions

Questions asked and still unanswered. Move them out once answered — into the section they belong to.

| # | Question | Asked | Blocks |
|---|---|---|---|
| Q-1 | `[NOT PROVIDED]` | | |

---

## Who writes here

**One shared procedure writes to this file.** The agent reads
`~/.claude/qa-assistant/updating-the-workspace.md` and follows it, recording here whatever a session
learns that stays true — a business rule you state, a platform it determines, an environment, a
role, an integration.

Two rules govern what lands here:

1. **Only durable facts.** True next month, for the next story too. Anything specific to one story
   belongs in that story's folder under `qa-output/`.
2. **A fact you stated outranks anything the agent deduced.** Where a new fact contradicts one
   recorded here, that is a finding — the agent surfaces both and lets you settle it, rather than
   silently overwriting.

`[NOT PROVIDED]` is a truthful answer; a guessed value is not. **Never write a secret here** —
record where it lives, never what it is.

**You can edit it too.** It is a plain markdown file in your repository, and the agent reads it
before every run.
