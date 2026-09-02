---
name: flow-to-test-plan
description: "Turn an under-specified business flow into an approved QA regression plan. Discovers the flow from requirements, a rough idea, or a live URL, builds a typed flow model with per-node evidence, renders it as a Mermaid diagram, and holds for flow approval — then derives user journeys, test cases, and a risk-grouped regression plan from the verified nodes only, and holds again for plan approval. Unverified nodes appear in the diagram but never enter approved coverage. Use when the user asks to map a flow, discover how a feature works, build a regression plan, chart a business process for testing, or turn a URL or vague feature idea into test coverage. Entry point: /flow-to-test-plan."
---

# Flow to Test Plan — QA flow discovery and regression planning

Act as a Senior Business Analyst and QA Architect. Transform an under-specified business flow into a
verified, evidence-backed QA regression plan — one where every approved test case traces back to
something concretely observed or supplied, and everything else is reported as a gap rather than
quietly assumed.

**Read `references/foundation.md` before starting.** It holds the safety rules, the approval gates,
the workspace conventions, and the host-adaptation mechanics this skill depends on.

The workflow:

```text
Discovery
→ flow.json
→ Mermaid diagram
→ GATE 1: Flow approval
→ User journeys
→ Test cases
→ Regression plan
→ GATE 2: Plan approval
→ Final approved QA package
```

The deliverable is a negotiated source of truth: a typed flow model, its Mermaid representation, an
understanding summary, an evidence log, verified user journeys, traceable test cases, a regression
plan, and a coverage and gap report.

**This skill ends when the regression plan is approved.** It does not generate or execute an
automated regression suite, and does not hand the approved plan to another skill.

---

## Step 0 — Load the workspace

Read `.qa/index.md` first (the map of every artifact — open what you need rather than sweeping the
tree), then `.qa/memory.md` (corrections are binding, decisions are settled, the work log says what
already exists) and `.qa/project-context.md` (platforms, business rules, roles, environments).
Search `.qa/knowledge/` for material already supplied, and `.qa/flows/` for a flow model that
already covers this feature — continue it rather than starting over.

If `.qa/` is absent, create it first — see the foundation, § Create it when it is missing.

**Never repeat a recorded mistake, re-ask a settled decision, or ask for something the workspace
already answers.**

---

## Core principle

`flow.json` is the canonical source of truth. `flow.mmd` is only a rendered representation of it.
**Never create or modify the diagram independently of the model.**

Every flow node carries a unique ID, a typed category, evidence, an evidence source, an evidence
reference, a confidence level, and a `verified` flag.

A node may be `verified: true` **only** when a concrete supplied or observed reference supports it.
Inferred, assumed, inaccessible, or unobserved nodes are `verified: false`.

Unverified nodes may appear in the diagram as dashed or flagged nodes. They must not enter:

- Approved user journeys
- Executable test cases
- Regression coverage
- The final regression plan

**Do not invent missing flows or business rules.** When critical information is missing, ask — and
offer a clearly labelled suggestion when one would help.

---

## Input modes

All four modes produce the same canonical `flow.json`. They differ only in how evidence is collected
and what initial verification status a node gets.

### Mode 1 — Full requirements

The user supplies requirements, user stories, business rules, acceptance criteria, or an expected
workflow.

- Explicitly provided steps may be `verified: true`.
- Every verified node references the exact requirement, story, criterion, or user statement.
- Expected but undocumented steps stay `verified: false`.
- Contradictions between requirements are recorded as open questions, not silently resolved.

### Mode 2 — Partial idea

The user supplies only a feature name, a goal, or a rough business idea.

- Build an initial understanding from the idea and available project context.
- Most inferred nodes start `verified: false`.
- Ask focused clarification questions.
- **Do not turn your own suggestions into verified requirements.**
- Keep facts, assumptions, proposals, and questions visibly distinct.

### Mode 3 — URL discovery

The user supplies a URL or starting page.

- Inspect the live surface with safe, non-destructive navigation.
- Build the model from directly observed pages, elements, routes, and states.
- Record an evidence reference for every observed node.
- **Do not assume unvisited or inaccessible routes exist.**

### Mode 4 — URL and feature focus

The user supplies a URL and names a specific feature.

- Navigate the shortest safe path to that feature.
- Discover its entry points, visible workflow, and one immediate downstream hop.
- Treat anything beyond observed scope as an unverified assumption.
- Do not expand into unrelated modules unless they are direct dependencies.

---

## URL discovery rules

**Discovery is observation, not test execution.** The purpose is to understand and model the flow
without changing system data.

### Allowed

Read the DOM and visible content · inspect forms and fields structurally · inspect labels, types,
states, and validation indicators · inspect buttons and available actions · inspect lists, tables,
statuses, and displayed records · navigate by links · open tabs · expand accordions and navigation
menus · use Back and Next in non-mutating wizards · open detail pages · open non-mutating drawers
and modals · record URLs and routes · observe permission and access restrictions.

### Forbidden during discovery

Submit a form · save data · create, update, or delete a record · confirm an operation · approve or
reject a request · perform a payment · submit a refund · send a notification · upload a file ·
import data · fill form fields · trigger anything that may change system state.

**If an action cannot be confidently classified as non-mutating, do not click it.** Record it as an
observed but unexercised action and mark the corresponding node `verified: false`.

### Session and credentials

- Reuse an existing authenticated browser session when available.
- If authentication is required, use only project-approved credentials supplied through secure
  environment variables.
- **Never** hard-code credentials, save them in an artifact, include them in `flow.json`, or expose
  them in logs, screenshots, or reports.
- **Never ask the user to paste a credential** into the prompt or a requirements document.

If authentication is required and approved credentials are unavailable:

1. Record the authentication wall as an observed node.
2. Continue with public and pre-authentication pages only.
3. Mark behind-login flows `verified: false`.
4. Add this banner to the Understanding Summary:

> Discovered pre-authentication behavior only. Authenticated flows remain unverified assumptions.

### Discovery scope

**A URL is a starting point, not evidence of complete system behavior.** These stay unverified
unless directly observed or supplied: unvisited routes · permission-gated pages · role-specific
states · conditional branches · error states · integration results · backend processing · success
behavior after mutating actions.

---

## Storage

Everything for one flow lives under `.qa/flows/<flow-slug>/`, where `<flow-slug>` is a kebab-case
identifier derived from the flow title:

```text
.qa/flows/<flow-slug>/
  flow.json          canonical typed flow model — validates against references/flow.schema.json
  flow.mmd           Mermaid diagram, generated from flow.json, never hand-maintained
  understanding.md   mode, purpose, scope, actors, rules, steps, assumptions, questions, limits, approvals
  evidence-log.md    per-node audit trail
  journeys.md        journeys derived from verified nodes only
  test-cases.md      cases derived from verified nodes only
  plan.md            regression groups, traceability, coverage, gaps, approval status
```

`evidence-log.md` records per node: node ID · evidence source · evidence reference · confidence ·
verification status · observation timestamp · the discovery interaction · what it revealed · related
screenshots when available.

**Do not create automated test-suite files. Do not execute the plan as part of this skill.**

Index every artifact you create — see [Recording what you learn](#recording-what-you-learn) below.

---

# Phase A — Converge on the flow truth

## Step 1 — Understand the input

Determine the active input mode, then gather evidence from whichever apply: user input ·
requirements · user stories · acceptance criteria · business-rule documents · approved designs ·
live URL discovery · `.qa/memory.md` and `.qa/project-context.md` · existing project artifacts ·
previously approved flow models.

Produce an Understanding Summary covering: flow title · input mode · business objective · scope ·
excluded scope · actors and roles · entry points · observed steps · known business rules · known
states and transitions · dependencies · assumptions · open questions · coverage restrictions.

**Do not silently resolve ambiguity.**

## Step 2 — Build the typed flow model

Create `flow.json`. Every node carries at least:

```json
{
  "id": "N001",
  "type": "action",
  "label": "Submit request",
  "actor": "Applicant",
  "verified": true,
  "evidence": { "source": "requirement", "ref": "US-01 / AC-03", "confidence": "high" }
}
```

Node types: `start` · `page` · `state` · `action` · `decision` · `validation` · `system_action` ·
`integration` · `notification` · `approval` · `success` · `failure` · `end` · `unknown`.

Every edge identifies its source, target, type, condition, evidence, and verification status:

```json
{
  "from": "N004",
  "to": "N005",
  "type": "conditional",
  "condition": "Request data is valid",
  "verified": true,
  "evidence": { "source": "acceptance_criteria", "ref": "AC-04", "confidence": "high" }
}
```

**Every decision node needs at least one success path and one failure, rejection, or alternative
path.** If an outcome is unknown, create an unverified placeholder rather than inventing the result.

## Step 3 — Render the Mermaid diagram

Generate `flow.mmd` from `flow.json`:

- Verified nodes: normal solid styling.
- Unverified nodes: dashed styling, with `UNVERIFIED` in the label.
- Decision nodes show labelled outgoing branches.
- Failure paths are visually distinguishable.
- Actors or system boundaries shown when useful.
- Node IDs stay traceable to `flow.json`.

**Do not use an external Mermaid service as the rendering engine.**

## Step 4 — Lint the diagram

Before presenting, verify: subgraphs balanced · node IDs unique · special characters escaped ·
labels with parentheses, colons, semicolons, hashes, or quotes safely formatted · no orphan nodes ·
every node connected unless documented as an isolated known gap · every decision node has at least
two typed outgoing edges · every failure path terminates or returns through a modelled retry ·
every rendered node and edge exists in `flow.json` · styling matches each `verified` value · model
and diagram have not diverged.

**If linting fails, correct and regenerate before presenting. Never present a failed diagram as
ready for approval.**

## Step 5 — Domain review

If a domain reviewer is configured and available, request a review of flow correctness · business
rules · approvals · state transitions · permission boundaries · financial rules · integrations ·
failure handling · missing paths · business risks.

Record each statement as confirmed domain evidence, a rejected assumption, an open objection, or a
suggested clarification. **A domain review does not verify a node** unless it carries a concrete
reference or explicit authoritative confirmation.

With no reviewer available: record `No domain sign-off`, keep unsupported domain assumptions
unverified, and continue to Gate 1.

---

# GATE 1 — Flow approval

**A hard stop.** Present the Understanding Summary · coverage limitations · actors and roles ·
verified flow steps · unverified assumptions · open questions · a `flow.json` summary · the rendered
diagram · the lint result · known flow gaps.

Ask the user to approve the flow, request changes, answer open questions, or confirm or reject the
unverified assumptions. **Present the gate with `AskUserQuestion` where the host provides it**,
listing the non-destructive option first.

**Do not begin journeys, test cases, or the plan before explicit approval.**

On approval, set `"status": "chart-approved"` and record the approver, date, approved version, and
any accepted limitations.

On corrections: update `flow.json` → regenerate `flow.mmd` → lint again → present again → ask again.

---

# Phase B — Derive the QA coverage

**Phase B begins only after Gate 1.** Everything here is mechanically derived from the approved
model.

## The verified filter

Apply it before generating any downstream artifact. Exclude every node where `"verified": false`.

Excluded nodes appear in the coverage report as known gaps. **Do not create executable test cases
that depend on unverified nodes, and do not silently drop them without reporting.**

## Step 1 — Derive user journeys

One journey per major verified path, each carrying: journey ID · name · actor · goal ·
preconditions · entry point · verified flow-node IDs · main steps · expected outcome · alternative
paths · failure paths · dependencies · business risk · coverage status.

Each journey references the exact node IDs it covers. **No unverified step goes inside an approved
journey.** If a major path contains one: exclude the path, record it as a journey gap, and name the
clarification needed to verify it.

## Step 2 — Derive test cases

Cover these categories where relevant: positive · negative · validation · boundary-value · decision
branches · state transitions · permissions · role-based · error handling · integration · retry ·
duplicate submission · data persistence · audit · notification · cross-page dependency ·
end-to-end.

Each case carries: TC ID · title · purpose · priority · test type · actor or role · preconditions ·
test data · numbered steps or Given/When/Then · expected result · covered node IDs · covered edge
IDs · covered business rules · dependencies · evidence source · verification status.

**Do not invent an expected result.** If one cannot be derived from approved evidence, exclude the
case from executable coverage and record it under `Needs clarification`.

## Step 3 — Build the regression plan

Create `plan.md` with:

**1. Metadata** — flow ID, title, version, approved chart version, creation date, target
environment, included and excluded roles, author, approval status.

**2. Test objective** — what the plan validates and which risks it addresses.

**3. Included scope** — verified journeys, paths, roles, states, integrations, business rules.

**4. Excluded scope** — unverified nodes and paths, unavailable roles, inaccessible pages,
unavailable integrations, unauthorized destructive scenarios, missing data states, open business
questions.

**5. Regression groups** — smoke · critical business flow · positive functional · negative and
validation · permission and security · state transition · integration · data consistency · error
handling · full regression. Each carries a group ID, title, risk level, included TC IDs, covered
node IDs, entry criteria, exit criteria, and execution priority.

**6. Traceability matrix**

| Node ID | Business rule | Journey ID | Test case IDs | Regression group | Coverage status |
|---|---|---|---|---|---|

**7. Coverage report** — total verified nodes · covered verified nodes · verified nodes with zero
cases · total unverified nodes · excluded unverified nodes · covered and uncovered decision branches
· covered and uncovered roles · covered and uncovered states · covered and uncovered integrations.

```text
Verified node coverage = covered verified nodes ÷ total verified nodes × 100
```

**Unverified nodes never count as covered.**

**8. Known gaps** — gap ID · related node or path · reason · business impact · required
clarification or access · recommended owner · priority.

**9. Entry criteria** · **10. Exit criteria** · **11. Risks and mitigations** (risk, probability,
impact, affected coverage, mitigation, owner).

**12. Final QA package contents** — the seven artifacts listed under Storage.

---

# GATE 2 — Regression plan approval

**Hard-stop before approval if:** a journey or test case depends on an unverified node · a verified
node has zero test cases · a verified decision branch has no coverage · a domain objection is
unresolved · an unresolved assumption affects expected behavior · a critical role or state is
missing · the traceability matrix has an orphan case or node.

If any exists: **do not describe the plan as ready.** Present the blocking issue, explain its
coverage impact, and request the specific clarification, evidence, role, or decision needed. Then
update the approved flow and regenerate the affected journeys, cases, traceability, and coverage.

If none exists, present: journeys summary · test case summary · regression groups · traceability
matrix · coverage metrics · excluded unverified nodes · known risks and gaps · the plan · the
approval request.

On approval, set `"status": "plan-approved"` and record the approver, date, plan version, accepted
limitations, and accepted coverage gaps.

Then present the Final Approved QA Package summary and **stop**.

---

## Recording what you learn

When the flow is approved, when the plan is approved, and whenever the run surfaces a durable fact
or a correction, follow `~/.claude/qa-assistant/updating-the-workspace.md` — the shared procedure
that records to `.qa/memory.md`, `.qa/index.md`, and `.qa/project-context.md` in one pass. Never
edit those three files ad hoc.

Index each artifact in the turn you create it, not at the end of the run.

---

## Output contract

For URL discovery modes, present in this order:

1. Coverage banner, when access is partial or pre-authentication only
2. Understanding Summary
3. Evidence log
4. Discovered actors and roles
5. Verified observed flow steps
6. Unverified inferred steps
7. Assumptions and open questions
8. `flow.json` draft
9. `flow.mmd` diagram
10. Mermaid lint result
11. **Gate 1 approval request**

After Gate 1: 12. journeys · 13. test cases · 14. regression groups · 15. traceability matrix ·
16. coverage report · 17. known gaps and risks · 18. regression plan · 19. **Gate 2 approval
request**.

After Gate 2: 20. Final Approved QA Package summary · 21. artifact locations · 22. accepted
limitations and remaining gaps · 23. **stop**.

For requirements and partial-idea modes, use the same order with the discovery-specific detail
reduced where it does not apply.

---

## Hard rules

- `flow.json` is the only source of truth; `flow.mmd` is a generated view. **Never let them diverge.**
- Every node carries evidence and a verification status. **Never `verified: true` without a concrete reference.**
- Do not invent unobserved flows. Mark inferred steps `verified: false`.
- Unverified nodes may appear in the diagram but **never** enter approved journeys, executable cases, or regression coverage.
- During URL discovery: never submit, save, create, update, delete, confirm, approve, reject, pay, send, import, upload, or fill. **Treat ambiguous actions as mutating and do not click them.**
- Use only approved credentials from environment variables. **Never hard-code, save, display, or log a credential.**
- **Gate 1 is a mandatory hard stop.** Do not derive coverage before flow approval.
- **Gate 2 requires explicit approval.** Do not call a plan ready while a hard-stop condition exists.
- Maintain traceability: evidence → node → journey → test case → regression group.
- Report every excluded unverified node as a coverage gap.
- **Do not claim complete coverage** while roles, states, branches, data, or integrations remain unverified.
- Do not create an automated regression suite. Do not execute test cases here.
- End after presenting the approved QA package.

## Language

Match the user's language completely — headings, table headers, table contents, and narrative all
take it. Keep in English only: identifiers (`N001`, `TC-001`, `AC-2`), priorities and severities,
statuses, verdicts, markers, field names, node type values, JSON keys, API paths, status codes,
untranslatable technical terms, and `Given/When/Then` blocks. See `references/foundation.md` §10.
