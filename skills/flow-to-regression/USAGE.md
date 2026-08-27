# FLOW_TO_REGRESSION — Usage Guide

Practical, day-to-day guidance for using the `flow-to-regression` skill. This document is
version-controlled and maintained alongside the skill (`skill.md`, `flow.schema.json`).

> **One sentence to internalize:** output quality is a direct function of how much *verifiable
> truth* you give it. A URL alone gets you an honest skeleton; requirements + URL gets you a real
> suite; for reflection / approval / audit flows, requirements are **not optional**.

---

## When to use this skill

Use FLOW_TO_REGRESSION when you need **a regression suite (or a structured flow model) for a whole
flow and don't have one yet.**

It is a **structuring and orchestration** skill — it builds the scaffold the execution skills run
on. It does **not** find bugs and does **not** execute the app (it observes during discovery, never
mutates).

| Use it when… | Don't use it when… |
|---|---|
| You have an idea / requirements / URL but no flow model | You just want to find bugs on a page → use **SWEEP** |
| A flow spans multiple stories or none exists yet | You have one clean story to verify → use **story-test** |
| You need to manufacture `suite.md` content for regression | You already have a `suite.md` → use **agentic-regression** directly |
| You want one conductor from idea → suite | You want to *run* an existing journey → use **journey-test** |

---

## Recommended workflows

### Ideal Sara workflow

```
            (requirements / story / rules)
                       │
   SWEEP  ─────────────┤  ← evidence in
     │                 ▼
     └────────►  FLOW_TO_REGRESSION
                       │
                 flow.json + flow.mmd
                       │
                  GATE 1 — chart approval
                       │
              journeys + test cases + plan.md
                       │
                  GATE 2 — plan approval
                       │
              invoke AGENTIC_REGRESSION
                       │
              Regression Suite + run
                       │
                  Suite Summary
```

### Where it fits relative to other skills

- **Before SWEEP?** No. SWEEP is cheap and needs nothing — run it first; its findings are evidence.
- **After SWEEP?** Yes — ideal. SWEEP findings enrich the chart, journeys, and plan.
- **Before STORY_TEST?** Optional. Use it when the flow spans multiple stories or no story exists.
- **Before AGENTIC_REGRESSION?** Yes — this is its primary job. It produces the suite content, then invokes agentic-regression.

---

## URL-only usage

```
flow-to-regression
URL: https://staging.pplus.app/workspaces
```

**What you get:** URL Discovery mode. The skill observes the live UI surface, builds `flow.json`,
renders `flow.mmd` with unverified nodes drawn dashed, and produces an evidence log.

**Realistic expectation (~4–5/10):** a small, true, **mostly-dashed** result — an accurate map of
the observable surface, with most nodes flagged unverified. Validation, negative, edge, and state
cases are deferred as coverage gaps because discovery cannot fill forms, submit, or mutate.

Treat URL-only output as a **draft to react to**, then feed it the rules it's missing.

> **Requires a session.** With no logged-in session and no approved env credentials, discovery is
> limited to **public / pre-auth pages only** — near-empty for an authenticated app like PPlus.

---

## URL + Feature Focus usage

```
flow-to-regression
URL: https://staging.pplus.app/workspaces
Focus: Workspace Creation workflow
```

**What you get:** the shortest path to the named feature, that workflow's surface, **plus one hop**
(its entry point(s) and immediate success/next screen). Anything beyond one hop is recorded as a
`not-explored` assumption — not a guess.

Use this when you know exactly which workflow you care about. It is cleaner and faster than URL-only.

---

## Requirements-based usage

Provide requirements, a story, or business rules — optionally with a URL.

```
# Requirements only
flow-to-regression
Requirements: <rules, validation limits, roles, required reflections>
Focus: <feature>

# Requirements + URL  (the sweet spot — ~7–8/10)
flow-to-regression
Requirements: <rules>
URL: <staging-url>
Focus: <feature>

# From a ticket
flow-to-regression for PPLUS-1234
```

**Why this is strongest:** requirements supply the rules a URL can't see (validation, who-can-do-what,
required reflections); the URL verifies those rules actually render. Verified nodes go up, the
verified-filter excludes less, and negative / validation / permission / state coverage materializes.

---

## SWEEP → FLOW_TO_REGRESSION workflow

```
1) Sweep https://staging.pplus.app/workspaces for bugs
2) flow-to-regression  URL: https://staging.pplus.app/workspaces  Focus: Workspace Creation
```

A prior SWEEP improves all three downstream artifacts:

- **Chart** — SWEEP-confirmed elements/states become `source: sweep` evidence → nodes flip to
  `verified:true` → fewer dashed nodes.
- **Journeys** — SWEEP-confirmed reachable paths → more verified paths survive the filter.
- **Plan** — SWEEP-found bugs/risk areas get prioritized as known-fragile, raising the suite's
  bug-catching value.

**SWEEP first is strictly better than running FLOW_TO_REGRESSION cold.**

---

## Chart Approval workflow (GATE 1 — hard stop)

After Phase A, the skill presents the chart and **stops**. Nothing downstream is generated until you
approve.

```
# Review the chart and evidence, then:
approve the chart
```

- Review which nodes are **dashed (unverified)** — that's the honest signal of how much is still
  assumption.
- If too much is dashed, **add requirements** and re-run before approving.
- On approval, `flow.status` → `chart-approved` and Phase B begins.

This gate is a **hard stop** — it never auto-proceeds.

---

## Plan Approval workflow (GATE 2 — required approval)

After Phase B, the skill presents `plan.md` (the regression plan) and asks for approval. **Suite
generation begins only after this approval.**

```
# Review the plan + coverage report, then:
approve the regression plan
```

GATE 2 **hard-stops and asks** (does not present the plan as ready) if any of:

- a derived journey or case depends on a `verified:false` node,
- a coverage gap exists (a verified node with zero cases),
- a domain objection was logged,
- an unresolved assumption remains.

If it hard-stops, the plan is thin for a reason — close the gap (add rules, exercise a run, get
domain sign-off) and re-run, rather than approving a hollow plan.

---

## Regression Suite generation workflow (Phase C — orchestrated)

Once the plan is approved, the skill **automatically**:

1. Derives a suite id from the flow slug (confirm or override it).
2. **Invokes `agentic-regression`**, passing the approved `plan.md` content as free-form test-case
   input + the suite id.
3. `agentic-regression` creates `.sara/regression/suites/<suite-id>/suite.md`, builds its
   self-healing map, and runs the suite.
4. Returns a **Suite Summary**: suite location, what was generated, run outcome (pass/fail per case),
   and carried-over coverage gaps.

> `agentic-regression` owns the suite format, maps, and execution. FLOW_TO_REGRESSION never writes
> `suite.md` or anything under `.sara/regression/`.
>
> **If `agentic-regression` is not installed**, the skill stops after Gate 2 with the approved
> `plan.md` as the ready-to-run handoff — it does not generate a suite directly.

---

## Examples from PPlus

```
# 1. Workspace Creation — URL + Focus (staging access)
flow-to-regression
URL: https://staging.pplus.app/workspaces
Focus: Workspace Creation workflow

# 2. Modules Reflection — requirements + URL (reflection needs rules the UI hides)
flow-to-regression
Requirements: when a module is enabled on a workspace, it must reflect in the
  workspace nav, the modules list, and the audit log within the same session.
URL: https://staging.pplus.app/workspaces/{id}/modules
Focus: Module enable → reflection across surfaces

# 3. Risks — existing workflow + URL (approval transitions matter)
flow-to-regression
Focus: Risk creation → review → approval workflow
URL: https://staging.pplus.app/risks
Note: include the approval states and who can transition each.

# 4. Task Center — feature idea only (Partial mode; it will ask questions)
Use flow-to-regression on the Task Center feature.

# 5. Audit Logs — requirements + URL (audit = reflection/verification heavy)
flow-to-regression
Requirements: every create/update/delete on workspaces, modules, and risks must
  write an audit entry with actor, action, target, timestamp.
URL: https://staging.pplus.app/audit-logs
Focus: Audit log capture + filtering
```

> **Modules Reflection (#2), Risk transitions (#3), and Audit Logs (#5)** depend on **mutations and
> reflection** — exactly what URL discovery is forbidden to exercise. For these three, **requirements
> text is required**, not optional, to get past a thin happy-path result.

---

## Input quality → output quality

| Input level | Realistic quality | What you get |
|---|---|---|
| URL only | ~4–5/10 | Happy-path UI skeleton; most of the chart dashed; negative/validation deferred |
| URL + feature name | ~5/10 | Same, scoped and cleaner (focus + one hop) |
| **Requirements + URL** | **~7–8/10** | The sweet spot — rules become verified by the URL render |
| Full requirements (+ multi-role creds + Ziad) | ~8–9/10 | Verified flow; real negative/edge/state/permission coverage; domain sign-off |

The jump from **URL-only → requirements + URL** is the single biggest quality lever you have.

### Inputs that produce the strongest suite

1. Business requirements / a story with explicit rules (limits, roles, required reflections).
2. \+ A live URL to verify those rules render.
3. \+ Multi-role credentials in env vars (so permission branches verify instead of defer).
4. \+ A prior SWEEP of the same area.
5. \+ Ziad configured for the PMO domain (sign-off on transitions/approvals).

---

## Common mistakes and limitations

**Mistakes to avoid**

- **URL with no session/creds** → pre-auth only → near-empty on PPlus. Always have a session.
- **"Test everything" with no focus** → unbounded and shallow. Scope it.
- **Vague idea + unwillingness to answer clarifying questions** → guess-skeleton.
- **Expecting deep coverage from a URL for a server-rule-heavy flow** (pricing, eligibility) →
  structurally blind without requirements.
- **Asking it to find bugs** → wrong skill. It structures; SWEEP/story-test find.

**Limitations (by design)**

- URL discovery cannot see validation behavior, mutations, or server-side rules (fields are read,
  not filled; nothing is submitted).
- Coverage is gated by login credentials — single-role creds = single-role coverage.
- Journey/test-case quality is owned by `product-kit` / `story-test`; this skill brokers them.
- Domain review is best-effort — with no Ziad configured, domain aspects are only flagged unverified.
- The Mermaid lint is a model instruction, not a parser — broken charts are less likely, not impossible.
- No drift/re-sync yet — if a flow changes later, re-run and diff node IDs (true self-healing is v2).

---

## Best practices

- **Feed it truth.** Requirements + URL beats URL alone every time. For reflection/approval/audit
  flows, always include requirements.
- **SWEEP first** when you can — the findings enrich every downstream artifact.
- **Always have a logged-in session or env credentials** before pointing it at staging.
- **Scope with Focus.** Name the feature; don't ask it to map a whole product.
- **Read the dashed nodes at Gate 1.** They tell you exactly what is still assumption — close the
  gaps before approving rather than after.
- **Trust the hard-stop at Gate 2.** A thin plan is the skill being honest, not failing — fix the
  input, don't approve a hollow plan.
- **Use the right tool for the job:** FLOW_TO_REGRESSION *structures*, SWEEP/story-test *find*,
  journey-test *runs* a journey, agentic-regression *re-runs* the suite.

---

*Maintained with the skill. Update this file when the skill's workflow, gates, or handoff contracts
change.*
