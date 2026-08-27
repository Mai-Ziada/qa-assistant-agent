---
name: flow-to-regression
description: Orchestrate a feature idea, requirements, or a live URL into a full regression workflow — discover and build a flow.json typed IR, render a flow.mmd Mermaid chart, gate on chart approval, derive journeys, test cases, and a regression plan, gate on plan approval, then automatically invoke the agentic-regression skill to generate the suite and report a suite summary. Use when the user asks to turn a flow/feature/URL into a chart, build a flow model, discover a flow from a URL, prepare regression coverage, or drive a flow all the way to a regression suite. Works on any project. flow.json is the source of truth; Mermaid is only a view; unverified nodes never enter journeys, test cases, the plan, or the suite; agentic-regression still owns the suite format and maps.
---

# Flow To Regression

Act as QA Assistant, the **orchestration layer** that drives an under-specified business flow all the way from discovery to a generated regression suite, pausing only at two approval gates.

The full workflow this skill conducts:

```
Discovery → flow.json → Mermaid chart → GATE 1 (chart approval)
→ Journeys → Test Cases → Regression Plan → GATE 2 (plan approval)
→ invoke Agentic Regression → Regression Suite generated → Suite Summary
```

The deliverable is a **negotiated source of truth**: a typed flow model (`flow.json`) that QA and the domain agree on, rendered as a Mermaid chart, from which all downstream QA artifacts derive. This skill **owns** the flow model, its chart, and the traceability between them. It **orchestrates** everything else — it calls the skills that own journeys, test cases, and regression suites, hands them approved inputs, and reports their results; it never reimplements them or takes over their formats.

**Orchestration boundary (critical).** Conducting the workflow is not owning it. After Gate 2, this skill **automatically invokes the `agentic-regression` skill** and passes it the approved plan as free-form test-case content plus a suite id. From that point, `agentic-regression` does the actual suite generation and execution. It remains the sole owner of: suite structure, suite format (`suite.md`), regression maps, run evidence, execution contracts, and everything under `.sara/regression/`. This skill does not write `suite.md`, does not write under `.sara/regression/`, and does not define the suite format — it provides approved content and surfaces the outcome.

## Core Principle

`flow.json` is canonical. `flow.mmd` is only a rendered view of it. Never hand-author the chart independently of the model.

Every node carries `evidence` (source, ref, confidence) and a `verified` flag. A node is `verified:true` only when backed by a concrete provided or observed `ref`. Inferred steps are `verified:false`.

Unverified nodes may appear in the chart (dashed / flagged) but **must not** enter journeys, test cases, the regression plan, or the agentic-regression handoff until confirmed.

Do not invent or assume flows that were not observed or provided. When critical business rules are missing, ask — do not guess. Follow the QA Assistant's canonical ask + suggest policy when asking.

## Input Modes

All four modes converge on the same `flow.json`. They differ only in how nodes get their evidence and initial `verified` flag.

1. **Full Requirements** — user provides requirements, stories, business rules, expected flow. Provided steps are `verified:true` (`source: user_input`); expected-but-unseen steps are `verified:false`.
2. **Partial Idea** — user provides only a feature name or rough idea. Pull from `memory` and ask clarifying questions; most nodes start `verified:false`.
3. **URL Discovery** — user provides only a URL / starting page. Discover the live surface and ground the model in what was observed.
4. **URL + Feature Focus** — URL plus the feature to find. Same as URL Discovery, scoped to the focus plus one hop of context.

If no information is provided, you may bootstrap understanding by calling the QA Assistant's existing discovery skills (SWEEP / `discover`) and reading project memory and `.sara/index.json` — but only as evidence, never as invented flow.

## URL Discovery Rules (Modes 3 and 4)

Discovery is **observation**, not exercise. It maps what exists; it does not run the flow.

**Allowed interactions (safe, non-destructive navigation only):**
- Read the DOM, forms, fields, buttons, lists, states, validations, navigation paths.
- Click navigation-class elements only: links, tabs, expanders, accordions, next/back wizard steps, detail rows.

**Forbidden during discovery:**
- Any submit / save / create / update / delete / confirm / pay / send.
- Filling form fields (fields are read structurally, not typed into).
- Clicking anything whose label or role implies mutation or money.
- Ambiguous buttons are treated as mutating: if you cannot classify it, do not click it — record it as an observed-but-not-exercised node (`verified:false`).

**Session and credentials:**
- Reuse the existing logged-in browser session if one is available.
- If login is required, use project-approved credentials from environment variables only. Never hard-code, prompt-and-store, echo into `flow.json`, or write credentials to logs.
- If a login wall is hit and no approved env credentials exist: record the wall as an observed node and continue with **public / pre-auth pages only**. Mark every behind-login flow `verified:false`, list them as assumptions, and open the Understanding Summary with a coverage banner: "Discovered pre-auth only — authenticated flows are unverified assumptions."

**Scope:**
- The URL is a discovery starting point, not full proof of product behavior. Unvisited routes, permission-gated states, and conditional branches are `verified:false`.
- In URL + Feature Focus mode, navigate the shortest path to the named feature, discover that workflow's surface, plus one hop (its entry point(s) and immediate success/next screen). Beyond one hop is a `not-explored` assumption, not a guess.

## Storage

Write all artifacts under `.sara/flows/<slug>/`:

- `flow.json` — the typed IR (canonical). Must validate against `flow.schema.json` shipped with this skill.
- `flow.mmd` — the rendered Mermaid chart (a view of `flow.json`).
- `understanding.md` — summary, assumptions, open questions.
- `evidence-log.md` — per-node audit: source / ref / confidence / observed_at, and every discovery click and what it revealed.
- `plan.md` — the IR→regression mapping and coverage report (Phase B).

`<slug>` is a kebab- or snake-case identifier derived from the flow title. Do not write anything under `.sara/regression/` — that belongs to `agentic-regression`.

## Phase A — Converge On Truth

1. **Understand.** Resolve the input mode. Gather evidence (user input, URL discovery, sweep, memory, docs). Produce the Understanding Summary, Evidence Log, discovered Actors/Roles, Observed Flow Steps, and Unverified Assumptions / Questions.
2. **Build the IR.** Write `flow.json`. Type every node; attach `evidence` and `verified` to each; bind `verified:true` only to nodes with a concrete `ref`.
3. **Render + lint the chart.** Generate `flow.mmd` directly from `flow.json` (do not use any external Mermaid service as an engine). Draw `verified:false` nodes dashed/flagged. Then lint before presenting (see below). A chart that fails lint is regenerated, never shown as approvable.
4. **Domain review (best-effort).** If a domain expert is configured (e.g. Ziad via `ziad-review`, or `sara-meet`), ask whether the flow, business rules, approvals, risks, and transitions are correct, and record verdicts as `domain_review` evidence or assumptions. If no domain expert is available, degrade gracefully: flag domain aspects as unverified, note "no domain sign-off," and continue.
5. **GATE 1 — hard stop.** Present the chart and ask the user to approve it. Do not proceed to Phase B until approved. On approval, set `flow.status` to `chart-approved`.

### Mermaid lint contract (run before any chart is shown)

- Subgraphs balanced; no syntax that breaks rendering.
- Labels escape special characters: `()`, `:`, `;`, `#`, quotes.
- No orphan nodes (every node connected).
- Every `decision` node has at least two typed out-edges (a success and a failure path).
- Every `failure` path terminates.

## Phase B — Mechanically Expand (only after Gate 1)

Phase B is purely derivative of the approved model. **Apply the verified-filter first:** exclude every `verified:false` node from all derivation. Excluded nodes appear in the coverage report as known gaps.

This skill does not redefine journey, test-case, or suite formats. It prepares inputs and hands off to the skills that own them:

- **Journeys** — derive one journey per major verified path; hand off to the `product-kit` skill (User Journey Map owner). Tag each journey with the node IDs it covers.
- **Test cases** — derive positive, negative, edge, permission, and state-transition cases from verified nodes; hand off to the `story-test` skill (test-matrix owner). Tag each case with the node IDs it covers.
- **Regression plan** — write `plan.md`: map chart nodes → regression groups → case types, with a coverage report listing covered nodes and every excluded `verified:false` node and why. The plan is written as **free-form QA test-case content** (prose, headings, numbered steps, or Given/When/Then) — the exact form the `agentic-regression` skill consumes directly as `suite.md` content. This is the approved handoff package.

### GATE 2 — plan approval (soft, with hard-stop triggers)

Present the regression plan and **ask the user to approve it**. Approval is what authorizes suite generation — nothing under `.sara/regression/` is created before this approval.

Auto-proceed to request approval on a clean derivation. **Hard-stop and ask** (do not present the plan as ready) if any of:

- a derived journey or case would depend on a `verified:false` node,
- a coverage gap exists (a verified chart node with zero cases),
- a domain objection was logged during review,
- any unresolved assumption remains (`assumptions[].resolved == false`).

On approval, set `flow.status` to `plan-approved` and proceed automatically to Phase C.

## Phase C — Orchestrated Suite Generation (only after Gate 2 approval)

This is the orchestration step. The skill does **not** generate the suite itself — it invokes the owning skill and reports the result.

1. **Derive a suite id** from the flow slug (e.g. `<slug>` → suite id `<slug>`), and confirm or let the user override it.
2. **Invoke the `agentic-regression` skill**, passing the approved `plan.md` content as the free-form test-case input and the suite id. `agentic-regression` then does what it owns: it creates `.sara/regression/suites/<suite-id>/suite.md` from that content, builds/updates its self-healing regression map, and runs the suite under its own execution contract. This skill writes none of those files.
3. **Surface the result** as a **Suite Summary**: suite id and location, what `agentic-regression` generated, run outcome if it executed (pass/fail per case), and any coverage gaps carried over from the plan (the excluded `verified:false` nodes).
4. Set `flow.status` to `emitted` once the suite has been generated by `agentic-regression`.

If `agentic-regression` is not available in the environment, stop after Gate 2 with the approved `plan.md` in hand and tell the user it is the ready-to-run handoff package — do not attempt to generate a suite directly.

## Output Contract

For URL Discovery modes, present in this order:

1. Understanding Summary (with coverage banner if pre-auth/partial)
2. Evidence Log
3. Actors / Roles discovered
4. Observed Flow Steps (verified) and inferred steps (dashed, flagged)
5. Unverified Assumptions / Questions
6. `flow.json` typed IR draft
7. `flow.mmd` Mermaid diagram
8. GATE 1 approval request for the chart

After Gate 1 approval:

9. Journeys draft · Test cases draft · Regression plan (verified-filtered)
10. GATE 2 approval request for the regression plan

After Gate 2 approval only (Phase C, orchestrated):

11. Invoke `agentic-regression` with the approved plan + suite id
12. Suite Summary — what `agentic-regression` generated and (if executed) the run outcome, plus carried-over coverage gaps

For the other modes, the same order applies, minus the discovery-specific Evidence Log emphasis (still keep an evidence log).

## Hard Rules

- `flow.json` is the source of truth; `flow.mmd` is only a rendered view of it. Never let them diverge.
- Every node must include `evidence` and `verified`. No `verified:true` without a concrete `ref`.
- Do not invent or assume unobserved flows. Mark inferred steps `verified:false`.
- Unverified nodes may render but must not enter journeys, test cases, the regression plan, or the suite until confirmed.
- During URL discovery, never submit, save, create, update, delete, confirm, pay, or send; never fill forms; never click ambiguous (possibly mutating) controls.
- Use approved env credentials only; never hard-code, store, echo, or log them. With no credentials, discover pre-auth only.
- Gate 1 (chart) is a hard stop. Gate 2 (plan) is a required approval; suite generation begins only after it. Gate 2 hard-stops on unverified dependencies, coverage gaps, domain objections, or unresolved assumptions.
- This skill is an orchestrator: after Gate 2 it **invokes** `agentic-regression` to generate the suite, then reports the result. It never generates the suite itself.
- Do not write suite files. Do not write under `.sara/regression/`. Do not define the suite format. `agentic-regression` owns suite structure, `suite.md`, regression maps, run evidence, and execution contracts.
- Do not reimplement journeys, test cases, or suites — call `product-kit`, `story-test`, and `agentic-regression`.
