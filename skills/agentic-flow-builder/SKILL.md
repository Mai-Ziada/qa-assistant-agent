---
name: agentic-flow-builder
description: "Build, run, verify, diagnose and repair Playwright automation for a business flow, and keep it maintainable over time. Generates a Flow Knowledge Map with primary, fallback and last-resort locators, then proves resilience across three verification runs before the flow counts as verified. Diagnoses every failure before touching anything, so an application bug is never hidden by a locator edit. Use when the user asks to automate a flow, write or generate Playwright tests, build an automated regression flow, run or re-run an existing flow, find out why a test failed, fix a broken or flaky test, or update automation after a requirement changed. Entry point: /agentic-flow-builder."
---

# agentic-flow-builder

**Read `~/.claude/qa-assistant/foundation.md` before starting.** It holds the safety rules, the
untrusted-content protection, the data-protection rules, the approval gates, and the workspace
contract every QA Assistant skill obeys. Where this file and the foundation differ on safety, **the
foundation wins**. Everything below adds what is specific to building and maintaining automation.

This skill ships its own supporting files, all under this directory:

| Directory | Holds |
|---|---|
| `commands/` | One file per command — build, run, verify, analyze, repair, update, list, show |
| `policies/` | Locator, interaction, isolation, evidence, repair and state policies |
| `schemas/` | `flow-map.schema.yaml` and `run.schema.yaml` — the contracts a Map and a Run must satisfy |
| `templates/` | Starting points for a Map, a `flow.ts` and a `spec.ts` |
| `runtime/` | The canonical runtime copied into a project on first use |

**Read the relevant command file before running that command**, and the policy files before
generating or changing locators, interactions or evidence handling. This file is the contract; those
files are how it is carried out.

## Purpose

`agentic-flow-builder` builds, executes, verifies, analyzes, repairs, and updates Playwright-based agentic/automated business flows.

The skill uses Playwright MCP for UI discovery and exploration when needed, but generated automation MUST use stable Playwright locators and executable Playwright code.

The skill manages the full automation lifecycle:

```text
Discover
→ Model
→ Build
→ Verify
→ Run
→ Diagnose
→ Repair / Update
→ Revalidate
```

The generated automation must prioritize:

- test isolation
- maintainability
- stable locators
- deterministic execution
- explicit assertions
- structured run history
- evidence-driven failure diagnosis
- safe repair
- reusable knowledge without cross-flow runtime dependency

---

# 0. Before anything else — the workspace and the environment

## 0.1 Load the workspace

Read `.qa/index.md` first (the map of every artifact — open what you need rather than sweeping the
tree), then `.qa/memory.md` (corrections are binding, decisions are settled, the work log says what
already exists) and `.qa/project-context.md` (platforms, business rules, roles, environments).
A recorded correction about this project's automation is binding here too.

If `.qa/` is absent, create it — see the foundation, § Create it when it is missing.

Record what the run learns through `~/.claude/qa-assistant/updating-the-workspace.md` — the shared
procedure. Never edit those three files directly.

## 0.2 Confirm the environment before anything executes ⛔

**This skill runs real automation against a real application.** A flow that creates a user, submits
an order or deletes a record does exactly that, every run, three times over during verification.

Before the first execution of any command that runs a browser — `BUILD FLOW`, `RUN FLOW`,
`VERIFY FLOW`, `REPAIR FLOW`, `UPDATE FLOW`, and `ANALYZE FAILURE` when it reproduces — establish
and state:

| # | Must establish |
|---|---|
| 1 | **The target environment, and explicit confirmation it is not production.** Check `.qa/project-context.md` § Environments first. |
| 2 | Where credentials live — an env var or a store. **Never ask for a pasted secret, and never write one into a Map, a Run, or generated code.** |
| 3 | Whether the flow creates, modifies, deletes, sends, publishes or charges — and whether that is acceptable in this environment |
| 4 | Whether test data can be created and cleaned up, or must be seeded in advance |

**Never run against production unless the user says so unambiguously** — and when they do, confirm
once more, naming what the flow will actually do there. Verification's three runs make this sharper
than a single test pass: a flow that creates a record creates three.

Present that confirmation with `AskUserQuestion` where the host provides it, listing the
non-destructive option first.

If the environment cannot be established, **stop before generating or executing** and say what is
missing. Do not build a flow against an unknown target.

---

# 1. Core Principles

Always follow these principles.

## 1.1 Flow Independence

Every independent flow MUST be runnable independently.

A flow MUST NOT require another flow to run before it.

Do not reuse runtime state created by another independent flow.

```text
Flow A runtime state
≠
Flow B prerequisite
```

Knowledge may be reused across flows, but runtime state must not be shared across independent flows.

## 1.2 Knowledge Reuse, Not Runtime Dependency

Existing flows may be inspected for reusable knowledge such as:

- known elements
- stable locators
- module navigation
- common steps
- component behavior
- interaction knowledge

When reused, copy the relevant knowledge into the new Flow Map and record its provenance.

Do NOT create runtime dependencies such as:

```ts
await runOtherFlow();
```

unless the user explicitly defines the flows as one combined E2E journey.

Preferred model:

```text
Existing Flow Map
      ↓
Reusable Knowledge
      ↓
New Flow Map

Runtime Dependency: NONE
```

## 1.3 MCP Exploration Is Not Test Automation

Playwright MCP is used for exploration, discovery, inspection, and investigation.

MCP snapshot references such as:

```text
ref=e31
```

MUST NOT appear in generated automation.

Generated Playwright automation must use the Flow Map and stable Playwright locators.

## 1.4 Diagnose Before Repair

Never modify automation merely because a test failed.

Always:

```text
Failure
→ Collect context
→ Diagnose
→ Classify
→ Decide whether automation repair is allowed
```

A business/application failure MUST NOT be hidden by changing locators, assertions, expected results, interaction methods, or test code.

## 1.5 Generated Does Not Mean Verified

A newly generated flow is not trusted immediately.

Every new flow starts as:

```text
DRAFTED
```

and must pass three dedicated verification runs before becoming:

```text
VERIFIED
```

## 1.6 No Fixed Production Waits

Do not generate fixed sleeps such as:

```ts
page.waitForTimeout(...)
setTimeout(...)
sleep(...)
```

for production automation.

Use:

- Playwright locator auto-waiting
- web-first assertions
- URL conditions
- response/event conditions
- explicit application state

Wait for a state or event, not an arbitrary amount of time.

## 1.7 Business Result and Automation Health Are Different

Keep these concepts separate.

Example:

```text
TC01 PASS
TC02 application failure
TC03 PASS
```

Possible Flow Run result:

```text
PARTIAL_FAILED
```

while Automation Map status remains:

```text
VERIFIED
```

A product failure does not automatically mean automation is unhealthy.

---

# 2. Skill Package vs Workspace Runtime

There are two separate architectures.

## 2.1 Agent Skill Package

The canonical skill lives inside the agent skill directory.

Expected structure:

```text
skills/
└── agentic-flow-builder/
    ├── SKILL.md
    ├── commands/
    │   ├── build-flow.md
    │   ├── run-flow.md
    │   ├── verify-flow.md
    │   ├── analyze-failure.md
    │   ├── repair-flow.md
    │   ├── update-flow.md
    │   ├── list-flows.md
    │   └── show-flow.md
    ├── policies/
    │   ├── locator-policy.md
    │   ├── interaction-policy.md
    │   ├── isolation-policy.md
    │   ├── evidence-policy.md
    │   ├── repair-policy.md
    │   └── state-policy.md
    ├── schemas/
    │   ├── flow-map.schema.yaml
    │   └── run.schema.yaml
    ├── templates/
    │   ├── flow.map.template.yaml
    │   ├── flow.flow.template.ts
    │   └── flow.spec.template.ts
    └── runtime/
        └── <canonical runtime package>
```

The runtime inside the skill package is the canonical runtime template.

## 2.2 Project Workspace

On first use inside a project, ensure this structure exists:

```text
<workspace-root>/
└── agentic-flow-builder/
    ├── runtime/
    └── flows/
```

If the workspace folder does not exist:

1. Create `agentic-flow-builder/`.
2. Copy the complete canonical `runtime/` from the Skill package.
3. Create `flows/`.

Do NOT copy the following into the workspace:

```text
commands/
policies/
schemas/
templates/
SKILL.md
```

Those belong to the Agent Skill Package.

## 2.3 Existing Workspace Runtime

If:

```text
<workspace-root>/agentic-flow-builder/runtime/
```

already exists:

```text
REUSE IT
```

Never silently overwrite it with the canonical Skill runtime.

The workspace runtime may contain intentional project-specific changes.

Runtime upgrade/migration is a separate maintenance concern.

## 2.4 Workspace Runtime Rules

The workspace runtime is shared infrastructure for all generated flows in that project.

Treat it as stable by default.

Do NOT modify workspace runtime because one flow requires a special workaround.

Modify runtime only when there is a justified project-level reason such as:

- runtime defect
- missing reusable capability
- project-specific integration requirement
- project-wide compatibility requirement

Runtime modifications must be intentional and explicit.

---

# 3. Workspace Readiness Rule

Before any execution or mutation command, ensure the workspace runtime is initialized and ready.

Commands requiring readiness:

```text
BUILD FLOW
RUN FLOW
VERIFY FLOW
REPAIR FLOW
UPDATE FLOW
```

`ANALYZE FAILURE` requires readiness only when reproduction/execution is needed.

Read-only inspection commands:

```text
LIST FLOWS
SHOW FLOW
```

do not require the full readiness gate.

## 3.1 Readiness Lifecycle

Before a command that requires execution or mutation:

```text
Locate workspace root
        ↓
Check agentic-flow-builder/
        ↓
Missing?
   ┌────┴────┐
   │         │
 YES         NO
   │         │
Create       Reuse
folder       existing
   │         runtime
Copy runtime │
Create flows │
   └────┬────┘
        ↓
Run workspace runtime compatibility check
        ↓
      READY?
      /    \
    YES     NO
     ↓       ↓
Continue    STOP
command     Report exact incompatibility
```

## 3.2 Readiness Requirements

The workspace runtime compatibility check is the Runtime Readiness Gate.

It must validate the runtime against the current workspace before automation execution proceeds.

The check should cover, as implemented by the workspace runtime:

- Node runtime compatibility
- `@playwright/test`
- supported Playwright version
- `yaml`
- TypeScript availability
- runtime file completeness
- project/package configuration
- TypeScript/module compatibility
- runtime imports
- runtime self-check
- TypeScript validation against the workspace when supported

## 3.3 Readiness Failure

If readiness fails:

- STOP the requested execution/mutation command.
- Report exact compatibility errors.
- Do not generate a new Flow.
- Do not start verification.
- Do not create incomplete final Run files.
- Do not overwrite the workspace runtime automatically.

## 3.4 Workspace Initialization Is Not Runtime Upgrade

Initialization occurs only when the workspace Skill folder is missing.

If the workspace runtime already exists, reuse it.

Do not treat every command as permission to refresh the runtime from the canonical Skill package.

---

# 4. Generated Flow Structure

Each generated flow MUST be flow-centric.

Example:

```text
agentic-flow-builder/
└── flows/
    └── create-user/
        ├── create-user.map.yaml
        ├── create-user.flow.ts
        ├── create-user.spec.ts
        ├── helpers/
        │   ├── auth.ts
        │   ├── data.ts
        │   └── state.ts
        └── runs/
            ├── 2026-09-04T18-10-03+03-00.yaml
            └── ...
```

Responsibilities:

```text
<flow>.map.yaml
= current Flow Knowledge

<flow>.flow.ts
= executable business implementation

<flow>.spec.ts
= Playwright Test wrapper / orchestration

helpers/
= optional, flow-specific supporting code (e.g. an auth adapter, data
  lookup, runtime state, file builders) that the flow's own
  implementation needs but that isn't itself Flow Knowledge, business
  implementation, or test orchestration

runs/
= immutable execution history
```

The three standard files (`<flow>.map.yaml`, `<flow>.flow.ts`, `<flow>.spec.ts`) always stay at the
flow's root; `helpers/` exists only when the flow's own implementation needs supporting code that
doesn't belong in any of them. Per § 1.1 Flow Independence, helper code is scoped to its own flow —
it is not a place to share code across flows.

Failure evidence belongs to the project's existing evidence architecture, not inside the flow folder unless the existing project architecture explicitly requires otherwise.

---

# 5. Supported Commands

The skill supports:

```text
BUILD FLOW
RUN FLOW
VERIFY FLOW
ANALYZE FAILURE
REPAIR FLOW
UPDATE FLOW
LIST FLOWS
SHOW FLOW
```

Commands may be expressed conversationally. Exact syntax is not required.

Determine intent from the user's request.

---

# 6. BUILD FLOW

Use `BUILD FLOW` when automation for the requested flow does not yet exist.

## 6.1 Supported Inputs

A flow may be supplied through:

- Chat Description
- Document
- Test Cases
- Mixed Sources

Documents may include:

- PRD
- User Story
- business requirements
- Markdown
- PDF
- Word
- specification
- process documentation

Optional supporting inputs include:

- flow name
- role
- preconditions
- starting URL/page
- expected results
- test-data references
- existing related flows

## 6.2 Input Normalization

Do NOT build automation directly from raw input.

First normalize all supplied information into one internal Flow Definition.

Conceptually:

```yaml
flow_definition:
  name: create-user
  objective: Admin creates and validates users.
  role: admin
  preconditions:
    - admin account exists
  flow_steps:
    - login
    - open users
    - create user
  test_cases:
    - valid user
    - duplicate email
    - required field
  expected_results: []
  data_requirements: []
```

All build sources must become one normalized Flow Definition.

## 6.3 Input Conflict Priority

If supplied sources conflict:

```text
1. Explicit current user instruction
2. Provided Test Cases
3. Provided Business/Requirement Document
4. Existing Flow knowledge
5. Observed current UI
```

Observed application behavior MUST NOT redefine expected business behavior.

## 6.4 BUILD FLOW Workflow

Perform:

```text
1. Normalize supplied flow information.

2. Locate project root.

3. Ensure workspace agentic-flow-builder/ exists.

4. If first initialization:
   - create agentic-flow-builder/
   - copy canonical runtime/
   - create flows/

5. If workspace runtime already exists:
   - reuse it
   - never overwrite it automatically.

6. Run workspace runtime compatibility/readiness check.

7. If NOT_READY:
   STOP BUILD and report exact incompatibility.

8. Inspect existing project architecture.

9. Locate existing:
   - test data
   - evidence root
   - Playwright configuration
   - related automation
   - existing generated flows

10. Search existing Flow Maps for reusable knowledge.

11. Identify:
    - flow steps
    - TCs
    - modules
    - reusable components
    - actors
    - preconditions
    - required data

12. Use Playwright MCP to explore the target UI.

13. Walk the required business journeys.

14. Identify interactive and assertion-critical elements.

15. Generate:
    - target contract
    - Primary locator
    - Fallback locator
    - Last Resort locator
    - preferred interaction
    - assertions

16. Generate the Flow Knowledge Map.

17. Generate <flow>.flow.ts.

18. Generate <flow>.spec.ts.

19. Create runs/.

20. Set Map status:
    DRAFTED

21. Validate generated artifacts.

22. Run VERIFY FLOW automatically.
```

`BUILD FLOW` is not complete merely because files were generated.

---

# 7. Flow Knowledge Map

The Flow Map is the primary knowledge source for the flow.

The first section MUST contain ordered flow steps.

The Map should contain:

```text
flow steps
metadata
execution context
auth model
data references
test cases
elements
target contracts
Primary locators
Fallback locators
Last Resort locators
interaction knowledge
assertions
verification state
project integration references
agent notes
```

Do not store execution history inside the Map.

Execution history belongs in `runs/`.

---

# 8. Locator Policy

Every interactive or assertion-critical element MUST have, where practical:

```text
Primary
Fallback
Last Resort
```

## 8.1 Default Locator Preference

Use this default preference:

```text
1. getByTestId()
2. getByRole()
3. getByLabel()
4. semantic scoped/chained locator
5. getByPlaceholder()
6. getByText()
7. getByAltText()
8. stable explicit attribute
9. CSS
10. XPath
11. nth()
```

This is a preference heuristic, not a blind ranking.

If `getByTestId()` exists and is stable, prefer it as Primary.

## 8.2 Locator Independence

Primary, Fallback, and Last Resort should use independent strategies where practical.

Preferred pattern:

```text
Primary:
getByTestId()

Fallback:
getByRole()

Last Resort:
stable scoped CSS
```

## 8.3 Target Contract

Every important element should define its semantic target.

Example:

```yaml
target_contract:
  role: button
  accessible_name: Add User
  unique: true
```

All locator strategies must resolve the same intended target.

A locator returning one element is not enough; candidate target correctness must also be validated.

---

# 9. Interaction Policy

The Flow Map defines the preferred interaction.

Examples:

```text
text input
→ fill()

checkbox/radio
→ check()

select
→ selectOption()

file input
→ setInputFiles()

normal button
→ click()
```

Use `pressSequentially()` only when actual sequential keyboard events are required.

## 9.1 Interaction Alternatives Are Not Automatic Fallbacks

Locator fallback and interaction alternatives are different.

Do NOT automatically do:

```text
fill failed
→ pressSequentially
```

or:

```text
click failed
→ press Enter
```

Interaction changes require diagnosis and explicit Map changes.

---

# 10. Test Case Structure

Each TC inside a flow MUST be a real Playwright:

```ts
test(...)
```

declared through one `flowTest(...)` call (`templates/flow.spec.template.ts`) so that a TC not
selected for the current Run is never declared at all, rather than declared and skipped inside its
body -- the latter still instantiates the TC's `page` fixture before the skip takes effect.

A flow may use:

```ts
test.describe(...)
```

Steps inside each TC may use:

```ts
test.step(...)
```

and/or:

```ts
runtime.step(...)
```

Do NOT convert whole TCs into `test.step()` blocks inside one giant test.

---

# 11. Test Isolation

Each TC receives an isolated BrowserContext by default.

TCs should not rely on browser state produced by other TCs.

Prefer independent setup.

If multiple actions genuinely form one inseparable business E2E journey, model them as one E2E TC with multiple steps.

---

# 12. Authentication

Supported modes:

```text
inline
flow_scoped_shared
none
```

## 12.1 Inline Auth

Each TC performs its own login where appropriate.

## 12.2 Flow-Scoped Shared Auth

A Flow execution may authenticate once and create a temporary auth state for that Flow Run.

Each TC should still use an isolated BrowserContext.

Destroy temporary Flow-scoped auth state after the Flow Run.

## 12.3 Cross-Flow Authentication Sharing

Forbidden.

Reusable login implementation is allowed.

Reusable cross-flow authentication state is not.

---

# 13. Data Integration

Use the project's existing data architecture.

Do NOT create duplicated test-data files inside every Flow unless explicitly required.

The Map should reference project data.

If a generated Flow uses project data refs, its `spec.ts` MUST inject a compatible `RuntimeDataResolver` into the Flow Run Controller.

If auth mode is `inline` or `flow_scoped_shared`, its `spec.ts` MUST inject a compatible `RuntimeAuthManager`. A Flow MUST NOT proceed to verification with unresolved required data/auth adapter wiring.

## 13.1 Verification Data Isolation

The three verification runs must not invalidate each other.

Use:

- fresh run-scoped data
- safe cleanup
- isolated fixtures
- project-supported reset mechanisms

---

# 14. Generated flow.ts

`<flow>.flow.ts` contains executable business implementation.

It MUST NOT duplicate locator definitions from the Map.

Preferred:

```ts
await runtime.interact('add_user_button');
```

not:

```ts
await page.getByRole('button', { name: 'Add User' }).click();
```

`flow.ts` is responsible for:

- business orchestration
- explicit steps
- mapped interactions
- mapped assertions
- navigation
- Flow-scoped capabilities

It is NOT responsible for:

- final failure classification
- screenshots
- writing Run YAML
- changing Map state
- silently repairing locators

---

# 15. Normal Locator Resolution

Normal execution:

```text
Primary
   ↓
target resolution success?
   ├── YES → use target
   └── NO
        ↓
     Fallback
        ↓
 target resolution success?
   ├── YES → use target and record recovery
   └── NO
        ↓
     Last Resort
```

Fallback locators are only for target-resolution failures.

Do NOT use locator fallback because:

- resolved element is disabled
- application returned an error
- interaction failed after target resolution
- assertion value is wrong
- expected business state is missing
- request returned 500
- overlay blocks interaction
- form validation prevents submission

---

# 16. Assertions

Use explicit web-first assertions.

Examples:

```text
visible
hidden
enabled
disabled
text
value
checked
count
URL
business state
```

Assertions must target the intended mapped target.

Do NOT search elsewhere in the page merely to make an assertion pass.

---

# 17. force Actions

Do not generate:

```ts
click({ force: true })
```

or equivalent behavior by default.

Use forced actions only when explicitly justified by intended application behavior.

---

# 18. VERIFY FLOW

`VERIFY FLOW` validates locator resilience through three separate executions:

```text
primary_only
fallback_only
last_resort_only
```

Each execution writes its own Run YAML.

Official verification/revalidation MUST execute all Flow TCs. A selected subset may be used only for targeted `repair_validation`, and that targeted run MUST NOT satisfy one of the three official verification proofs.

Use run type `verification` for initial verification and `revalidation` while Map status is `REVALIDATION_REQUIRED`.

Initial `verification` is valid only in `DRAFTED`, `PRIMARY_VALIDATED`, or `FALLBACK_VALIDATED`, and must execute the next required strategy in order. `revalidation` is valid only in `REVALIDATION_REQUIRED` and proceeds Primary → Fallback → Last Resort for the current revision. Already `VERIFIED`/`DEGRADED` Flows use normal `RUN FLOW` for health unless a repair/update changes the automation definition and triggers revalidation.

## 18.1 Initial Verification

New Flow:

```text
DRAFTED
```

Primary PASS:

```text
DRAFTED
→ PRIMARY_VALIDATED
```

Fallback PASS:

```text
PRIMARY_VALIDATED
→ FALLBACK_VALIDATED
```

Last Resort PASS:

```text
FALLBACK_VALIDATED
→ VERIFIED
```

## 18.2 Failed Verification

If one strategy fails, do not automatically advance status.

Diagnose first.

Repair only when allowed.

---

# 19. REVALIDATION_REQUIRED

If a previously verified automation definition changes:

```text
REVALIDATION_REQUIRED
```

Examples:

- locator changed
- preferred interaction changed
- assertion changed
- automation behavior changed
- business Flow changed

Do NOT return to `DRAFTED`.

## 19.1 Revalidation

For a previously verified Flow:

```text
Primary PASS
→ REVALIDATION_REQUIRED

Fallback PASS
→ REVALIDATION_REQUIRED

Last Resort PASS
→ VERIFIED
```

Only after all required strategies pass for the current revision may it become VERIFIED again.

---

# 20. Map Revision Rules

Increase Map revision when automation knowledge or behavior changes.

Examples:

```text
locator definition changed
interaction changed
flow steps changed
assertion changed
relevant data mapping changed
```

Do NOT increase revision simply because a normal Run occurred.

Observed runtime health may change without a revision increase.

---

# 20.1 Runtime Execution Invocation Contract

Every Skill-managed Playwright execution MUST launch the generated Flow spec with an explicit Runtime execution context. Do not rely on Runtime defaults for official BUILD/VERIFY/RUN/REPAIR/UPDATE lifecycles.

Set, through the current workspace shell/process environment:

```text
AFB_RUN_ID
AFB_RUN_TYPE
AFB_EXECUTION_MODE
AFB_SELECTED_TCS   # only when a subset is intentionally selected
```

Rules:

- `AFB_RUN_ID` MUST be unique per logical Flow Run and filesystem-safe.
- Each Primary/Fallback/Last-Resort verification execution gets a different Run ID.
- Normal Run: `AFB_RUN_TYPE=normal`, `AFB_EXECUTION_MODE=normal`.
- Initial verification: `AFB_RUN_TYPE=verification`.
- Revalidation: `AFB_RUN_TYPE=revalidation`.
- Targeted repair check: `AFB_RUN_TYPE=repair_validation`.
- Official verification/revalidation MUST omit `AFB_SELECTED_TCS` (or set it to the complete TC set).
- Selected normal/repair runs may set `AFB_SELECTED_TCS` as a comma-separated TC-ID list.
- When `AFB_SELECTED_TCS` selects a subset, ALSO pass Playwright `--grep "<TC-ID> -"` (one
  alternation per selected TC, e.g. `--grep "TC05 -|TC06 -"`), so a spec generated before TCs were
  declared through `flowTest(...)` still skips instantiating the unselected TCs' fixtures. Never
  pass `--grep` without `AFB_SELECTED_TCS`: the runtime would still expect every TC, never finalize
  the Run, and leave the session/lock behind. Official verification/revalidation runs use neither.
- Set the environment for the Playwright child process; do not edit generated source files merely to change run mode.

For V1, execute one Playwright project/browser per logical Flow Run. If the workspace has a browser/project matrix, execute those as separate sequential Flow Runs so same-Flow locking and Run history remain deterministic.

---

# 21. RUN FLOW

`RUN FLOW` executes existing automation normally.

Normal execution is allowed only for Maps in `VERIFIED`, `DEGRADED`, or `DEGRADED_CRITICAL`. `DRAFTED`, partial initial-verification states, `REVALIDATION_REQUIRED`, and `BROKEN` require verification/repair/update before a normal Run.

Default mode:

```text
normal
```

TCs run as independent Playwright tests.

A single logical Flow Run may aggregate multiple TC executions into one Run history record.

Support selected TCs.

Unselected TCs are not counted as passed/failed/blocked.

---

# 22. Run History

Every Flow execution writes:

```text
runs/<timestamp>.yaml
```

Use filesystem-safe timestamps.

Example:

```text
2026-09-04T18-20-11+03-00.yaml
```

Each Run file is immutable after finalization.

---

# 23. Run Finalization Rule

All Run history MUST be finalized through the workspace Runtime `RunWriter`.

Commands and generated Flows MUST NOT write final Run YAML files directly.

Required lifecycle:

```text
RunSession
   ↓
RunWriter
   ↓
Validate final Run structure
   ↓
Valid?
 /    \
YES    NO
 ↓      ↓
Write   Reject finalization
temp    and report runtime error
 ↓
Atomic finalization
 ↓
runs/<timestamp>.yaml
```

Never finalize an invalid Run file.

Never overwrite an existing finalized Run.

---

# 24. Run Types

Supported:

```text
verification
normal
revalidation
repair_validation
```

Execution modes:

```text
normal
primary_only
fallback_only
last_resort_only
```

---

# 25. Flow Run Results

Supported aggregate results:

```text
passed
passed_with_recovery
partial_failed
partial_blocked
failed
blocked
```

## passed

All selected TCs passed and no locator recovery occurred.

## passed_with_recovery

All selected business scenarios passed, but Fallback or Last Resort was required.

## partial_failed

Some executed TCs passed and at least one failed.

## partial_blocked

Some selected TCs passed and some were blocked, with no failed TCs.

## failed

Requested execution materially failed without successful partial coverage.

## blocked

Requested execution could not meaningfully execute.

---

# 26. Map Health States

Supported:

```text
DRAFTED
PRIMARY_VALIDATED
FALLBACK_VALIDATED
VERIFIED
DEGRADED
DEGRADED_CRITICAL
BROKEN
REVALIDATION_REQUIRED
```

## DEGRADED

Primary fails during normal execution but Fallback succeeds.

## DEGRADED_CRITICAL

Primary and Fallback fail; Last Resort succeeds.

## BROKEN

Automation cannot execute required behavior due to confirmed automation failure.

Do NOT mark BROKEN because of product/business failures.

---

# 27. Failure Classification

Before repair, classify failures into:

```text
application_failure
locator_failure
interaction_failure
assertion_failure
data_failure
auth_failure
environment_failure
navigation_failure
automation_code_failure
unknown
```

Do not guess when evidence is insufficient.

Use `unknown`.

---

# 28. Evidence Policy

Do NOT capture screenshots for every step.

Default:

```text
PASS
→ no screenshot

PASS_WITH_RECOVERY
→ no screenshot by default

FAIL
→ screenshot
```

Use the project's existing evidence root.

Preferred structure:

```text
<evidence-root>/
└── agentic-flow-builder/
    └── <flow-name>/
        └── <run-id>/
            └── <failed-tc>.png
```

---

# 29. Trace Policy

Structured Run data is the primary agent-readable diagnostic source.

Preferred investigation order:

```text
Run YAML
→ Flow Map
→ Screenshot
→ Trace
→ MCP re-exploration if needed
```

Prefer retaining Trace on failures.

Do not retain traces for every successful execution by default.

Playwright writes the retained trace only after the worker finishes with the test, later than
failure-evidence capture, so it does not land in the evidence folder above. The Run record points
to it by its known path under the project's own per-run output directory instead
(`test-results/<run-id>/trace.zip` when `playwright.config.ts` keys `outputDir` by run id) — see
`evidence-policy.md` § 20. A `globalSetup` prunes old per-run output folders to the newest 10 by
default.

---

# 30. Application/Business Failure Policy

If automation correctly:

- resolved intended target
- executed intended interaction
- reached intended application action

but application behavior is wrong:

- classify as application/business related when supported by evidence
- capture failure evidence
- do NOT automatically repair automation
- preserve Map health unless independent automation failure was observed

---

# 31. ANALYZE FAILURE

`ANALYZE FAILURE` is read-only.

Do not modify:

- Map
- flow code
- spec
- runtime
- previous Runs

Investigation order:

```text
1. Run YAML
2. Flow Map
3. Screenshot
4. Trace if required
5. MCP re-exploration only if required
```

If reproduction is required, execute the workspace readiness gate first.

---

# 32. REPAIR FLOW

Use only for confirmed or sufficiently evidenced automation failures.

Workflow:

```text
1. Ensure workspace runtime is READY.
2. Read relevant failed/degraded Run.
3. Read current Map.
4. Review diagnosis.
5. Inspect evidence when needed.
6. Confirm automation-related classification.
7. Identify minimum safe change.
8. Update Map/code.
9. revision++
10. status = REVALIDATION_REQUIRED
11. targeted repair_validation when useful
12. full VERIFY FLOW
```

Do not repair `application_failure` or `unknown` automatically.

---

# 33. UPDATE FLOW

Use for intentional business or requirement changes.

Workflow:

```text
1. Ensure workspace runtime is READY.
2. Read current Map.
3. Normalize new requirement.
4. Compare old/new Flow definition.
5. Determine impacted steps/TCs/elements/interactions/assertions/data.
6. MCP explore changed/new areas when needed.
7. Reuse valid knowledge.
8. Update Map/flow/spec.
9. revision++
10. REVALIDATION_REQUIRED
11. VERIFY FLOW
```

Do not delete old Run history.

---

# 34. LIST FLOWS

Read-only.

Show useful fields such as:

```text
Flow
Revision
Map Status
Last Run
Last Result
```

Do not execute tests.

Do not require full runtime readiness.

---

# 35. SHOW FLOW

Read-only.

Display:

```text
Flow name
Revision
Status
TC count
Step count
Element count
Locator health
Last Run
Last Result
Known automation issues
Brittle locators
```

Do not modify automation.

Do not require full runtime readiness.

---

# 36. MCP Usage Policy

```text
BUILD FLOW
→ expected

UPDATE FLOW
→ likely

REPAIR FLOW
→ only when existing evidence is insufficient

ANALYZE FAILURE
→ only when evidence is insufficient

RUN FLOW
→ not required by default

VERIFY FLOW
→ not required by default

LIST FLOWS
→ never required

SHOW FLOW
→ never required
```

Do not perform MCP discovery during normal automation execution unless investigation requires it.

---

# 37. Knowledge Reuse Search

Before building a new Flow, inspect existing Maps for:

- same module
- same page
- same component
- same semantic target
- same navigation
- same interaction behavior

If reusable knowledge is found, record provenance.

The actual locator definition must still exist in the new Flow Map.

The new Flow must remain independently runnable.

---

# 38. Shared Component Candidates

If the same component appears repeatedly across many Flows, the Skill may recommend promotion into shared project infrastructure.

Examples:

- DatePicker
- Sidebar
- SearchTable
- Toast
- FileUploader

Do NOT automatically restructure the project.

---

# 39. Run Concurrency

In V1:

```text
Same Flow
→ serialize executions

Different Flows
→ parallel execution may be allowed
```

Prevent concurrent same-Flow mutation of:

- Map status
- verification information
- Run aggregation
- runtime health metadata

Use Flow-scoped locking where supported.

---

# 40. Run History Immutability

After:

```text
runs/<timestamp>.yaml
```

is finalized, do not modify it.

Historical Runs are evidence of what happened under a specific revision.

---

# 41. Secrets and Sensitive Runtime Data

Do not write into Maps or Run history:

- passwords
- access tokens
- cookies
- Authorization headers
- session secrets
- secret environment variables

Use project data/config references.

---

# 42. Runtime Boundary

Generated Flows use the workspace runtime.

Runtime responsibilities include:

```text
compatibility/readiness checking
locator resolution
interaction execution
assertion execution
structured failure signals
Run orchestration
Run aggregation
Run validation/finalization
diagnosis support
evidence handling
Map state transitions
data resolution
Flow-scoped auth
Flow locking
```

Flow-specific business logic belongs in:

```text
<flow>.flow.ts
```

Flow-specific tests belong in:

```text
<flow>.spec.ts
```

Do not push Flow-specific hacks into shared runtime.

---

# 43. Expected Workspace Result

After multiple Flows are built:

```text
<workspace-root>/
├── <project files>
├── data/
├── evidences/
│   └── agentic-flow-builder/
│       └── ...
└── agentic-flow-builder/
    ├── runtime/
    │   └── <project runtime instance>
    └── flows/
        ├── create-user/
        │   ├── create-user.map.yaml
        │   ├── create-user.flow.ts
        │   ├── create-user.spec.ts
        │   └── runs/
        └── checkout/
            ├── checkout.map.yaml
            ├── checkout.flow.ts
            ├── checkout.spec.ts
            └── runs/
```

---

# 44. Final Automation Philosophy

Always optimize for:

```text
Stable automation
over automation that merely passes today.

Diagnosis
over blind self-healing.

Business correctness
over forcing green tests.

Flow isolation
over hidden runtime dependency.

Structured knowledge
over duplicated selectors.

Explicit state
over implicit assumptions.

Reusable project infrastructure
over per-flow hacks.

MCP discovery
over MCP-dependent generated tests.
```

The goal of `agentic-flow-builder` is not simply to produce Playwright code.

Its goal is to maintain a reliable, inspectable, repairable automation knowledge system for independently executable business flows.

---

# 45. Language

Match the user's language completely when talking to them — explanations, findings, diagnoses,
status reports, and the reasoning behind a repair decision all take it.

**Generated artifacts stay in English regardless**, because they are code and data read by tools
as well as people: Flow Maps, `flow.ts`, `spec.ts`, Run YAML, locator definitions, test names,
assertions, and every identifier in them. A Map half in one language is harder to maintain than a
Map in the language its team does not prefer.

Also keep in English: Map statuses (`VERIFIED`, `DEGRADED`, `BROKEN`), run results (`passed`,
`partial_failed`), run types, execution modes, failure classifications (`locator_failure`,
`application_failure`), environment variable names (`AFB_RUN_ID`), file paths, and untranslatable
technical terms.
