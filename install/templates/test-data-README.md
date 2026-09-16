# Test Data

Where this project's test data lives — accounts, cards, seed records, and anything else a test
needs to run against, written once instead of retyped into every run. **This file explains the
structure and naming; it does not hold the data itself.**

**The agent reads the relevant file or folder before executing anything.** When a run needs a
value that is not there, it asks you for it, then records the answer so the next run does not ask
again.

---

## Structure

Two kinds of test data, in two different places:

```
test-data/
  users.md                   system-wide — example category
  payment-credentials.md     system-wide — example category
  <category>.md              any other system-wide category this project needs
  <STORY-ID>-<STORY-SLUG>/    data that belongs to one story only
```

**System-wide data — one `.md` file per category.** Anything with a fixed, stable use across the
whole product gets its own file: accounts → `users.md`, payment test cards →
`payment-credentials.md`, seed records → `seed-records.md`, and so on. **There is no fixed list** —
every project's categories differ. Create a file the first time this project needs one, named for
what it holds, and cite it by name from a test case rather than restating the value
(`Admin account — see users.md`).

**Story-specific data — one folder per story, named `<STORY-ID>-<STORY-SLUG>`** (the same
convention as `qa-output/` and `.qa/screenshots/`). Anything that belongs only to that story — an
uploaded spreadsheet, an image, an attachment, or a plain value that will never apply anywhere
else — goes inside that story's folder, in whatever form it naturally takes. The agent creates the
folder itself the first time a run needs one; check for a folder already starting with the story id
(`test-data/<STORY-ID>*/`) and reuse it rather than creating a second one because the slug drifted.

**Read the file or folder a case needs, not the whole directory.** `.qa/index.md` lists what
actually exists here.

---

## ⚠️ Secrets — no value by default, unless the user who owns it says otherwise

**By default, no secret values.** Not a password, an API token, a card number, a CVV, an OTP, a
session cookie, a private key, or a real customer's personal data.

Record **where the secret lives**, never what it is:

```markdown
| Role  | Username            | Password             |
|-------|---------------------|----------------------|
| Admin | qa.admin@test.local | `env: QA_ADMIN_PASS` |
```

That row is useful and safe. `| Admin | qa.admin@test.local | Passw0rd! |` is neither — **unless
the user who just supplied the password explicitly says to store it exactly like that.**

**When the user hands a credential to the agent directly, ask once before writing it: store it
as-is, or not?**

- **"As-is"** — the literal value goes in the category file. Their instruction overrides the
  default; nothing further to check.
- **Anything else** — offer `.env` at the project root instead (referenced here as
  `env: <VAR_NAME>`, same as any other environment variable), or not storing the value at all.

**This whole folder is git-ignored by default, and so is `.env`.** That is a second line of
defence, not the first — the first is not writing the secret down at all, which stays the default
until the person who owns the value says otherwise.

Payment cards are the exception people get wrong: a **published provider test card** (Stripe's
`4242 4242 4242 4242`, a sandbox PAN from your gateway's own docs) is documentation, not a secret,
and belongs here regardless. A card that can move real money never does, whatever environment it
is for, with or without permission.

---

## Example category files

Not a checklist, and not exhaustive — a shape to follow when a category needs its own file. Skip
any that this project's tests never need, and add categories these examples do not cover.

### `users.md` — Accounts

One row per role the tests need.

| Role | Username / email | Password | Environment | Notes |
|---|---|---|---|---|
| `[NOT PROVIDED]` | | `env: ` | | |

**Notes** is where the quirks go: MFA enabled, needs a fresh OTP, locks after 3 failures, expires
monthly, shared with another team — the things that cost a run when nobody wrote them down.

### `payment-credentials.md` — Payment data

Published provider test cards only. Name the provider and link its documentation.

| Purpose | Value | Expiry / CVV | Provider |
|---|---|---|---|
| Successful payment | `[NOT PROVIDED]` | | |
| Declined card | `[NOT PROVIDED]` | | |
| Insufficient funds | `[NOT PROVIDED]` | | |
| 3-D Secure challenge | `[NOT PROVIDED]` | | |

**Sandbox only.** If the gateway has no sandbox, write that here — it makes every payment case
`BLOCKED` rather than something to improvise around at execution time.

### `seed-records.md` — Seed records

Records that must exist before a test runs — and how to recreate them when they do not.

| Record | Identifier | State | How to recreate | Used by |
|---|---|---|---|---|
| `[NOT PROVIDED]` | | | | |

### `data-states.md` — Data states

The states a test needs to find something already in. Empty lists, expired items, maxed-out
quotas, partially completed flows — the states that take the longest to reach by hand.

| State | How to reach it | Notes |
|---|---|---|
| `[NOT PROVIDED]` | | |

### `reference-values.md` — Reference values

Codes, IDs and fixed values tests refer to by name: promo codes, tax rates, currency codes, feature
flags, tenant IDs, valid and invalid postcodes.

| Name | Value | Meaning |
|---|---|---|
| `[NOT PROVIDED]` | | |

### `known-invalid-values.md` — Known-invalid values

Values a test needs precisely because they fail — an over-length string, a malformed email, a
postcode outside the served area, an expired token. Recording them keeps the failure reproducible
instead of improvised differently each run.

| Purpose | Value | Expected failure |
|---|---|---|
| `[NOT PROVIDED]` | | |

### `cleanup.md` — Cleanup

What a run leaves behind, and what to do about it.

| What is created | Cleanup | Owner |
|---|---|---|
| `[NOT PROVIDED]` | | |

**Environments are not a category here.** Base URLs and per-environment write access live in
`.qa/project-context.md` instead — this folder is for test data, not environment configuration.

---

## Who writes here

**You do, and so does the agent.** Every file here is plain markdown in your repository — fill in
whatever you already know, and the agent reads the relevant one before every execution.

When a run needs a value that is missing, the agent **asks you rather than inventing one**, and
records your answer — in the matching category file if it is system-wide, or in that story's
folder if it belongs only there — through `~/.claude/qa-assistant/updating-the-workspace.md` so the
next run finds it. An invented account or a guessed promo code produces a failure that looks like a
bug and is not.

`[NOT PROVIDED]` is a truthful answer. A guessed value is not.

**Prune what is dead.** An account that no longer exists costs more than a missing one — it sends a
run down a path that cannot work.
