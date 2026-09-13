# Test Data

The accounts, records and values this project's tests run against — written once here instead of
re-typed into every run.

**The agent reads this before executing anything.** When a run needs a value that is not here, it
asks you for it, then records the answer so the next run does not ask again.

---

## ⚠️ What never goes in this file

**No secret values.** Not a password, an API token, a card number, a CVV, an OTP, a session cookie,
a private key, or a real customer's personal data.

Record **where the secret lives**, never what it is:

```markdown
| Role  | Username            | Password             |
|-------|---------------------|----------------------|
| Admin | qa.admin@test.local | `env: QA_ADMIN_PASS` |
```

That row is useful and safe. `| Admin | qa.admin@test.local | Passw0rd! |` is neither.

This file is **git-ignored by default**, because a file of test accounts is still worth keeping out
of a public repository. That is a second line of defence, not the first — the first is not writing
the secret down at all.

Payment cards are the exception people get wrong: a **published provider test card** (Stripe's
`4242 4242 4242 4242`, a sandbox PAN from your gateway's own docs) is documentation, not a secret,
and belongs here. A card that can move real money never does, whatever environment it is for.

---

## 1. Environments

| Environment | URL | Safe to write to | Notes |
|---|---|---|---|
| Staging | `[NOT PROVIDED]` | `[NOT PROVIDED]` | |
| Production | `[NOT PROVIDED]` | **No** | Read-only unless the user says otherwise, in writing, per run |

## 2. Accounts

One row per role the tests need. Add the roles this product actually has.

| Role | Username / email | Password | Environment | Notes |
|---|---|---|---|---|
| `[NOT PROVIDED]` | | `env: ` | | |

**Notes** is where the quirks go: MFA enabled, needs a fresh OTP, locks after 3 failures, expires
monthly, shared with another team — the things that cost a run when nobody wrote them down.

## 3. Payment data

Published provider test cards only. Name the provider and link its documentation.

| Purpose | Value | Expiry / CVV | Provider |
|---|---|---|---|
| Successful payment | `[NOT PROVIDED]` | | |
| Declined card | `[NOT PROVIDED]` | | |
| Insufficient funds | `[NOT PROVIDED]` | | |
| 3-D Secure challenge | `[NOT PROVIDED]` | | |

**Sandbox only.** If the gateway has no sandbox, write that here — it makes every payment case
`BLOCKED` rather than something to improvise around at execution time.

## 4. Seed records

Records that must exist before a test runs — and how to recreate them when they do not.

| Record | Identifier | State | How to recreate | Used by |
|---|---|---|---|---|
| `[NOT PROVIDED]` | | | | |

## 5. Data states

The states a test needs to find something already in. Empty lists, expired items, maxed-out quotas,
partially completed flows — the states that take the longest to reach by hand.

| State | How to reach it | Notes |
|---|---|---|
| `[NOT PROVIDED]` | | |

## 6. Reference values

Codes, IDs and fixed values tests refer to by name: promo codes, tax rates, currency codes, feature
flags, tenant IDs, valid and invalid postcodes.

| Name | Value | Meaning |
|---|---|---|
| `[NOT PROVIDED]` | | |

## 7. Known-invalid values

Values a test needs precisely because they fail — an over-length string, a malformed email, a
postcode outside the served area, an expired token. Recording them keeps the failure reproducible
instead of improvised differently each run.

| Purpose | Value | Expected failure |
|---|---|---|
| `[NOT PROVIDED]` | | |

## 8. Cleanup

What a run leaves behind, and what to do about it.

| What is created | Cleanup | Owner |
|---|---|---|
| `[NOT PROVIDED]` | | |

---

## Who writes here

**You do, and so does the agent.** It is a plain markdown file in your repository — fill in whatever
you already know, and the agent reads it before every execution.

When a run needs a value that is missing, the agent **asks you rather than inventing one**, and
records your answer here through `~/.claude/qa-assistant/updating-the-workspace.md` so the next run
finds it. An invented account or a guessed promo code produces a failure that looks like a bug and
is not.

`[NOT PROVIDED]` is a truthful answer. A guessed value is not.

**Prune what is dead.** An account that no longer exists costs more than a missing one — it sends a
run down a path that cannot work.
