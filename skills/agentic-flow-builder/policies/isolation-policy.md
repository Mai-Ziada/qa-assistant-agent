# Isolation Policy

## Purpose

This policy defines how `agentic-flow-builder` preserves independence between:

- flows
- test cases
- browser contexts
- authentication sessions
- test data
- verification runs
- runtime state

The primary goal is:

> A test must fail because the tested behavior failed, not because another test or flow left behind unexpected state.

---

# 1. Core Isolation Principle

Every independent Flow MUST be independently executable.

Never require:

```text
Flow A
↓
creates browser/session state
↓
Flow B
```

as a hidden execution dependency.

A Flow must establish or prepare everything required for its own execution.

---

# 2. Flow Isolation

Independent flows MUST NOT share runtime state.

Runtime state includes:

```text
browser page
BrowserContext
cookies
localStorage
sessionStorage
temporary authentication state
in-memory variables
runtime-created entity references
temporary files
execution locks
```

Example:

```text
Create User Flow
```

and:

```text
Approve Request Flow
```

may both use the same Admin account definition.

They MUST NOT depend on the same previously-created browser session.

---

# 3. Shared Knowledge vs Shared State

Allowed:

```text
Flow A Map
↓
reusable locator knowledge
↓
Flow B Map
```

Not allowed:

```text
Flow A Runtime
↓
authenticated session
↓
Flow B Runtime
```

The rule is:

> Reuse knowledge and implementation where useful. Do not reuse mutable execution state across independent flows.

---

# 4. Test Case Isolation

Each TC inside a Flow should be a real Playwright:

```ts
test(...)
```

and should receive a fresh BrowserContext by default.

Example:

```text
Create User Flow

TC-CU-01
→ Context A

TC-CU-02
→ Context B

TC-CU-03
→ Context C
```

This prevents one TC from unintentionally affecting another through browser state.

---

# 5. Do Not Depend on Test Execution Order

Tests should not assume:

```text
TC01 must run first
TC02 must run second
TC03 must run third
```

unless the business scenario is intentionally one continuous E2E journey.

If TC02 requires an entity created by TC01, first ask:

> Are these really two independent TCs?

If the answer is yes, TC02 should prepare its own required state.

If the answer is no, model the journey as one E2E TC containing multiple steps.

---

# 6. Example: Bad TC Dependency

Avoid:

```text
TC01
Create Request

TC02
Approve the request created by TC01

TC03
Pay the request approved by TC02
```

when each is intended to be independently executable.

This creates:

```text
TC01
↓
TC02
↓
TC03
```

and a single failure can block the entire suite.

---

# 7. Preferred Independent Model

Prefer:

```text
TC01 Create Request
→ prepares its own data

TC02 Approve Request
→ starts with an independently prepared approvable request

TC03 Pay Request
→ starts with an independently prepared payable request
```

State preparation may come from:

- API setup
- project fixtures
- database-supported setup
- existing test-data utilities
- approved reusable capabilities

Do not require UI Flow A to execute just to prepare Flow B unless the user explicitly wants the complete E2E journey.

---

# 8. Intentional E2E Journeys

A genuine E2E scenario may intentionally contain:

```text
Login
↓
Create Request
↓
Approve
↓
Pay
↓
Verify
```

This is valid when all steps represent one business journey being tested as a whole.

In this case:

```text
one TC
multiple steps
```

is preferable to artificial test dependency.

---

# 9. Authentication Isolation

Supported authentication models:

```text
inline
flow_scoped_shared
none
```

Authentication state MUST NOT be shared across independent Flow executions.

---

# 10. Inline Authentication

With:

```yaml
auth:
  mode: inline
```

each TC establishes its own login.

Example:

```text
TC01
Context A
↓
Login
↓
Scenario

TC02
Context B
↓
Login
↓
Scenario
```

Use when maximum test independence is desired or login is naturally part of the journey.

---

# 11. Flow-Scoped Shared Authentication

With:

```yaml
auth:
  mode: flow_scoped_shared
```

the Flow execution may establish authentication once and derive isolated contexts from that temporary authentication state.

Conceptually:

```text
Flow Run
   ↓
Authenticate
   ↓
Temporary Auth State
   ↓
┌─────────┬─────────┐
↓         ↓         ↓
TC01      TC02      TC03
Context   Context   Context
A         B         C
```

The BrowserContexts remain independent.

Only the initial authenticated state is reused.

---

# 12. Flow-Scoped Auth Lifetime

Flow-scoped authentication state belongs only to:

```text
current Flow Run
```

It must not become:

```text
global project authentication state
```

After the Flow Run finishes:

```text
temporary auth state
→ cleanup/delete
```

unless project-specific runtime handling securely manages temporary execution state elsewhere.

---

# 13. Cross-Flow Auth Is Forbidden

Never:

```text
Create User Flow
→ Admin session

Approve Request Flow
→ reuse previous Admin session
```

Even when both flows use the same role.

Instead:

```text
Create User
→ establishes Admin session

Approve Request
→ establishes independent Admin session
```

Reusable login code is allowed.

Shared mutable cross-flow authentication state is not.

---

# 14. Authentication Tests

When authentication itself is under test:

```text
valid login
invalid password
logout
session expiration
remember me
locked account
```

do not use pre-authenticated state to bypass the feature being tested.

Use:

```yaml
auth:
  mode: none
```

or equivalent explicit test design.

---

# 15. Data Isolation

Test data must be isolated enough that executions do not invalidate each other.

Examples requiring isolation:

```text
email
username
order number
request number
unique entity name
customer identifier
one-time operation
status-changing records
```

---

# 16. Verification Run Data Isolation

Verification runs are three independent executions:

```text
Primary-only
Fallback-only
Last-Resort-only
```

They must test locator strategies, not interfere through reused business data.

Bad:

```text
Run 1:
Create user email = qa@test.com

Run 2:
Create same user email = qa@test.com
→ duplicate failure
```

The second run would no longer prove Fallback locator health.

---

# 17. Verification Data Strategies

Use one of:

### Fresh Run-Scoped Data

```text
Run 1 → user-A
Run 2 → user-B
Run 3 → user-C
```

### Cleanup

```text
Setup
↓
Verification
↓
Delete/reset entity
```

### Isolated Fixture Records

Use dedicated records for each strategy.

### Environment Reset

Only when the project already supports a safe reset mechanism.

---

# 18. Data Source Reuse

Reuse the project's data architecture.

Example Map:

```yaml
data:

  sources:

    - id: valid_new_user
      ref: users.create_user_valid
```

The Data Resolver may generate a run-specific instance.

Do not unnecessarily duplicate static data inside Flow folders.

---

# 19. State-Changing Test Cases

Treat these interactions as state-changing:

```text
Create
Update
Delete
Approve
Reject
Cancel
Pay
Transfer
Publish
Submit
Activate
Deactivate
```

Before retrying or re-running setup, determine whether the previous operation actually happened.

Blind retries can create unintended state.

---

# 20. Retry Isolation

A retry must not assume the original attempt left the application untouched.

Example:

```text
Create User
↓
UI timed out
```

Before retrying Create User, determine whether the backend created the user.

Otherwise the retry may produce:

```text
duplicate user
```

and hide the original result.

---

# 21. BrowserContext Policy

Use isolated BrowserContexts for TC execution by default.

Avoid sharing one long-lived page across multiple independent tests.

Do not use:

```text
global shared page
```

as test-state storage.

---

# 22. Page Isolation

A TC may use multiple Pages when required by the business flow.

Examples:

```text
popup
new tab
multi-window workflow
```

These pages may exist within that TC's context.

Do not carry them into another independent TC.

---

# 23. Environment Isolation

Do not classify environmental instability as locator failure.

Examples:

```text
application unavailable
DNS failure
test environment outage
authentication service outage
API dependency unavailable
```

These should normally result in:

```text
environment_failure
```

or:

```text
blocked
```

depending on execution impact.

Do not repair automation because the environment is unavailable.

---

# 24. Flow Run Isolation

Each logical Flow Run receives a unique Run ID.

Example:

```text
2026-09-04T20-15-41+03-00
```

The Run ID scopes:

```text
Run aggregation
temporary auth
run-specific data
evidence
diagnostics
state transition evaluation
```

Do not mix artifacts from different Run IDs.

---

# 25. Evidence Isolation

Failure evidence should be scoped by:

```text
skill
→ flow
→ run
→ TC
```

Example:

```text
evidences/
└── agentic-flow-builder/
    └── create-user/
        └── 2026-09-04T20-15-41+03-00/
            └── TC-CU-02.png
```

This prevents evidence overwrite across runs.

---

# 26. Same-Flow Concurrency

In V1, executions of the same Flow MUST be serialized.

Avoid:

```text
Create User Run A ──┐
                    ├── concurrent Map updates
Create User Run B ──┘
```

Potential conflicts include:

```text
Map status
verification state
locator validation health
Run aggregation
repair operations
```

Use a Flow-scoped lock.

---

# 27. Different-Flow Concurrency

Different flows may execute in parallel when the surrounding project/environment supports it.

Example:

```text
Create User
Checkout
Search Products
```

may run independently.

However, project-level business data collisions must still be avoided.

---

# 28. Runtime Isolation

The workspace runtime is shared code infrastructure.

It is NOT shared mutable Flow state.

Runtime components should avoid maintaining global mutable data such as:

```text
current flow
current user
current page
current run
current test data
current locator strategy
```

outside explicit Run/TC-scoped objects.

---

# 29. Project Runtime Modification

Do not modify shared runtime to fix one Flow's isolated problem.

If one Flow requires:

```text
special locator
special interaction
special assertion
```

represent it in:

```text
Flow Map
flow.ts
```

where possible.

Change runtime only when the capability is genuinely shared or infrastructure-level.

---

# 30. Knowledge Reuse Independence

When knowledge is copied from another Flow Map, store provenance but not runtime dependency.

Example:

```yaml
knowledge_source:

  type: reused

  from_flow: create-request

  from_element: requests_menu

  source_revision: 7
```

If `create-request` is later deleted, the new Flow must still be executable.

---

# 31. Shared Component Promotion

If repeated knowledge appears across many flows, the skill may detect:

```text
DatePicker
Sidebar
Toast
Search Grid
File Upload
```

as shared-component candidates.

Do not automatically refactor Flow independence away.

Promotion to shared project infrastructure must preserve:

```text
independent execution
clear ownership
stable interface
```

---

# 32. Test Selection Isolation

If the user executes:

```text
RUN FLOW create-user TC-CU-03
```

only selected TCs belong to that Run.

Unselected TCs are not:

```text
passed
failed
blocked
```

They were not part of the execution.

The Run history should record the selection scope.

---

# 33. Partial Results

One TC failure must not prevent unrelated independent TCs from executing unless infrastructure or business dependency makes continuation impossible.

Example:

```text
TC01 FAIL
TC02 independent → execute
TC03 independent → execute
```

This enables meaningful:

```text
partial_failed
```

results.

---

# 34. Blocked Dependencies

If a TC has an intentional prerequisite and that prerequisite cannot be created, mark the dependent TC:

```text
blocked
```

Do not report it as a functional failure when it was never meaningfully executed.

---

# 35. Cleanup Policy

Cleanup should be:

- safe
- scoped
- deterministic
- limited to data created for the execution

Do not perform broad destructive cleanup such as:

```text
delete all users
clear all requests
reset entire environment
```

unless the project explicitly provides and permits such a test reset mechanism.

---

# 36. Cleanup Failure

Cleanup failure should be recorded separately from the business result when possible.

Example:

```text
TC passed
↓
cleanup failed
```

Do not rewrite the business assertion as failed if the scenario itself succeeded.

Record cleanup/runtime health separately and surface the issue.

---

# 37. Isolation Decision Rule

When considering shared state, ask:

```text
If this test runs alone
in a fresh execution,
will it still work correctly?
```

If the answer is no, the test probably has an unwanted dependency unless the dependency is intentionally part of one E2E journey.

---

# 38. Final Isolation Principle

Prefer:

```text
Independent setup
+
isolated execution
+
explicit cleanup
+
shared reusable knowledge
```

over:

```text
hidden test order
+
shared session
+
shared mutable state
+
cross-flow dependencies
```

Isolation is required not only for reliability, but also for trustworthy failure diagnosis.