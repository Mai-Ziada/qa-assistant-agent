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

## How the agent updates this file

Update it whenever a session learns something durable — the user states a business rule, a new
environment appears, a role is clarified, an integration surfaces.

1. **Only durable facts.** True next month, for the next story too. Otherwise it belongs in `qa-output/`.
2. **Never overwrite a confirmed fact with an inferred one.** A fact the user stated outranks anything you deduced.
3. **Cite the source** — who said it, or which file it came from.
4. **Contradiction is a finding.** When a new fact contradicts one recorded here, do not silently replace it: surface both to the user and let them settle it.
5. **Say what you changed** in one line, so an incorrect entry can be caught immediately.
6. **Never write a secret here.** Record where it lives, never its value.
