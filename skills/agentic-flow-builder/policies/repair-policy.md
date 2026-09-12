# Repair Policy

## Purpose

This policy defines when `agentic-flow-builder` is allowed to modify automation after a failure.

The objective is to support safe automation repair without hiding:

- application bugs
- business-rule failures
- environment problems
- test-data problems
- incorrect expectations
- genuine product regressions

The repair system must prioritize correctness over producing a green test.

---

# 1. Core Repair Principle

Never repair automation merely because execution failed.

Always follow:

```text
Failure
→ Collect evidence
→ Diagnose
→ Classify
→ Decide whether repair is allowed
→ Apply minimum safe change
→ Revalidate
```

The question is not:

```text
How can I make this test pass?
```

The question is:

```text
Is the automation implementation actually wrong?
```

---

# 2. Repair Permission

Automation repair is allowed only when evidence supports an automation-related cause.

Examples include:

```text
locator_failure
automation_code_failure
confirmed interaction implementation failure
confirmed navigation implementation failure
confirmed automation assertion implementation failure
```

Repair is NOT automatically allowed for:

```text
application_failure
data_failure
auth_failure
environment_failure
unknown
```

These require separate diagnosis.

---

# 3. Diagnosis Before Repair

Before changing any automation file:

1. Read the relevant Run YAML.
2. Read the current Flow Map.
3. Identify the failed TC.
4. Identify the failed step.
5. Review locator attempts if applicable.
6. Review interaction completion state.
7. Review assertion expected/actual values.
8. Review network observations if relevant.
9. Review screenshot if useful.
10. Review Trace if structured evidence is insufficient.
11. Use MCP re-exploration only when necessary.

Do not start by editing code.

---

# 4. Read Existing Evidence First

Default investigation order:

```text
Run YAML
→ Flow Map
→ Screenshot
→ Trace
→ MCP re-exploration
```

MCP should not be the first debugging action when enough evidence already exists.

---

# 5. Failure Classification

Before repair, classify the failure as one of:

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

Classification may later become more specific after investigation.

---

# 6. Unknown Failures

If classification remains:

```text
unknown
```

do NOT automatically repair automation.

Instead:

```text
collect more evidence
→ reproduce if needed
→ inspect Trace
→ use MCP when useful
→ classify again
```

A lack of understanding is not permission to modify code.

---

# 7. Application Failure

Example:

```text
Expected target resolved ✅
Interaction executed ✅
POST /api/users sent ✅
API response = 500 ❌
```

Classification:

```text
application_failure
```

Allowed actions:

```text
capture evidence
record failure
report diagnosis
continue independent TCs when possible
```

Forbidden:

```text
change locator
change expected result
remove assertion
add retry until API returns 200
hide the error
change interaction merely to bypass failure
```

Map health normally remains unchanged.

---

# 8. Business Rule Failure

Example:

Expected:

```text
Completed request should be payable.
```

Actual:

```text
Pay action is unavailable.
```

If automation correctly reached the intended state and target, do not modify automation to make Pay available.

This may indicate:

```text
business defect
application defect
incorrect setup
incorrect requirement
```

Diagnosis must resolve which one applies.

---

# 9. Locator Failure

Locator repair is allowed when evidence shows that the intended target cannot be correctly resolved by the expected locator strategy.

Example:

```text
Primary:
getByTestId('add-user')

Result:
0 matches

Fallback:
getByRole('button', { name: 'Add User' })

Result:
correct target
```

This supports:

```text
locator_failure
```

and may justify Primary locator repair.

---

# 10. Locator Repair Boundary

Do not classify a problem as locator failure if:

```text
the intended target was already resolved correctly
```

Examples:

```text
button resolved but disabled
button resolved but overlay blocks interaction
target resolved but application returned error
target resolved but assertion value is wrong
```

Changing locators in these situations is prohibited unless separate evidence proves a locator problem also exists.

---

# 11. Locator Promotion

If Primary fails and Fallback succeeds, do not immediately promote Fallback to Primary.

First determine:

- why Primary failed
- whether UI intentionally changed
- whether Primary was unstable
- whether Fallback is a stronger long-term contract
- whether target contract still matches

If promotion is justified:

```text
update Map
revision++
status → REVALIDATION_REQUIRED
```

Then run full verification.

---

# 12. Interaction Failure

An interaction failure may or may not be an automation failure.

Example:

```text
target resolved
fill() executed
application did not react
```

Possible causes include:

```text
application bug
keyboard-dependent custom control
wrong interaction implementation
wrong data
validation state
```

Do not automatically switch to:

```text
pressSequentially()
```

Diagnosis must first prove that the interaction method is inappropriate.

---

# 13. Interaction Repair

If diagnosis proves that a different method is required:

Example:

```text
fill()
```

must become:

```text
pressSequentially()
```

Then:

```text
update Map interaction
update implementation if required
revision++
status → REVALIDATION_REQUIRED
```

Do not make the alternative interaction an untracked runtime workaround.

---

# 14. Assertion Failure

An assertion failure does not automatically mean assertion code is wrong.

Example:

```text
Expected status:
Approved

Actual status:
Pending
```

Possible causes:

```text
application bug
wrong expected result
wrong test data
wrong precondition
assertion target problem
```

Do not:

```text
change Approved → Pending
```

merely because the current application shows Pending.

Expected behavior comes from requirements/TCs/business definition, not observed UI alone.

---

# 15. Assertion Repair

Repair an assertion only when evidence proves the automation assertion implementation is wrong.

Examples:

```text
wrong target element
wrong comparison method
incorrectly scoped assertion
incorrect technical normalization
```

Changing expected business behavior requires:

```text
UPDATE FLOW
```

not `REPAIR FLOW`.

---

# 16. Navigation Failure

Navigation-related failure may be repairable when the automation is using outdated or incorrect navigation implementation.

Examples:

```text
route changed intentionally
navigation helper incorrect
wrong module path in automation
```

But if the correct navigation action results in an application 404 or server failure:

```text
application/environment failure
```

may be more appropriate.

---

# 17. Data Failure

If test data is invalid, missing, stale, or conflicts with existing state:

```text
data_failure
```

Do not change locator or business assertions.

Repair may involve:

```text
data reference
run-scoped unique data
fixture preparation
cleanup
```

but this should be treated as test-data repair, not UI self-healing.

---

# 18. Auth Failure

Authentication failure may result from:

```text
invalid test credentials
expired temporary auth
login application bug
auth service outage
incorrect auth setup
```

Do not automatically change flow locators.

Determine whether the issue belongs to:

```text
auth setup
application
environment
automation
```

before repair.

---

# 19. Environment Failure

Examples:

```text
site unavailable
DNS failure
dependency outage
database unavailable
authentication service unavailable
```

Automation repair is not allowed merely to bypass environmental failure.

Run may become:

```text
blocked
```

or contain:

```text
environment_failure
```

depending on scope.

---

# 20. Automation Code Failure

Examples include:

```text
TypeScript runtime exception
invalid Flow Runtime usage
broken import
incorrect data mapping code
invalid runner implementation
```

Repair is allowed when clearly automation-owned.

Shared runtime changes require extra caution because they may affect multiple flows.

---

# 21. Shared Runtime Repair

Workspace runtime is shared infrastructure.

Do not modify it for a single Flow-specific workaround.

Before changing runtime, ask:

```text
Is this problem infrastructure-level
or Flow-specific?
```

If Flow-specific:

```text
fix Map
flow.ts
spec.ts
```

where possible.

If runtime-level:

```text
change runtime intentionally
evaluate affected flows
revalidate impacted automation
```

---

# 22. Runtime Change Impact

A runtime change may affect many flows.

Therefore runtime repair should identify:

```text
affected capability
affected flow types
potential impacted flows
required regression/revalidation scope
```

Do not assume only the currently failing Flow is affected.

---

# 23. Minimum Change Principle

Always apply the smallest change that addresses the confirmed root cause.

Example:

```text
one Primary locator broken
```

Preferred:

```text
repair one Primary locator
```

Avoid:

```text
rewrite Map
rewrite flow.ts
rewrite spec.ts
replace all locator strategies
```

without evidence.

---

# 24. No Blind Self-Healing

Forbidden pattern:

```text
Primary failed
→ generate new selector
→ update code
→ continue silently
```

Required pattern:

```text
Primary failed
→ Fallback may recover normal execution
→ record DEGRADED health
→ diagnose
→ repair explicitly
→ REVALIDATION_REQUIRED
→ verify
```

Recovery and repair are different concepts.

---

# 25. Recovery vs Repair

## Recovery

Occurs during execution.

Example:

```text
Primary fails
Fallback succeeds
```

Result:

```text
passed_with_recovery
```

Possible Map health:

```text
DEGRADED
```

No definition is necessarily modified during that Run.

---

## Repair

Occurs after diagnosis.

Example:

```text
replace outdated Primary locator
```

This modifies automation knowledge.

Then:

```text
revision++
REVALIDATION_REQUIRED
```

---

# 26. Last Resort Recovery

If Last Resort is required:

```text
Primary ❌
Fallback ❌
Last Resort ✅
```

the Flow may finish successfully but Map health becomes:

```text
DEGRADED_CRITICAL
```

This should strongly recommend repair.

Do not treat Last Resort success as healthy automation.

---

# 27. Complete Automation Failure

If:

```text
Primary ❌
Fallback ❌
Last Resort ❌
```

and diagnosis confirms locator/automation failure:

```text
Map → BROKEN
```

The Flow should not be considered healthy until repaired and revalidated.

---

# 28. Repair Revision

When automation definition changes:

```text
revision++
```

Examples:

```text
locator changed
interaction changed
assertion implementation changed
flow implementation changed
relevant data mapping changed
```

Then:

```text
Map status → REVALIDATION_REQUIRED
```

---

# 29. Repair Validation

After repair, a targeted execution may be used to verify the specific change.

Example:

```text
type: repair_validation
execution_mode: primary_only
```

If this passes:

```text
repair appears technically valid
```

but Map remains:

```text
REVALIDATION_REQUIRED
```

until full verification is complete.

---

# 30. Full Revalidation After Repair

After a repair affecting locator/interaction/flow automation:

```text
Primary verification
→ Fallback verification
→ Last Resort verification
```

Only after all required verification succeeds:

```text
VERIFIED
```

---

# 31. Repair Must Preserve Business Expectations

Do not repair by weakening business validation.

Forbidden examples:

```text
remove failing assertion
replace exact assertion with generic visibility
accept any success-like message
change expected status to actual status
ignore failed API response
```

unless requirements explicitly changed.

Requirement changes belong to:

```text
UPDATE FLOW
```

---

# 32. No Arbitrary Retry Repair

Do not solve failures by adding:

```text
retry 3 times
retry until passes
click again
submit again
```

without understanding whether the action is safe.

State-changing actions may already have executed.

Examples:

```text
Create
Pay
Approve
Delete
Transfer
Submit
Cancel
```

Blind retries may create duplicate or destructive effects.

---

# 33. Retry Diagnosis

Before retrying a state-changing action:

```text
Did the original action reach the backend?
Did the entity already change state?
Did navigation happen?
Did the operation partially succeed?
```

Use available network/application evidence.

---

# 34. No Fixed-Wait Repair

Do not repair:

```text
flaky locator
```

with:

```ts
waitForTimeout(5000)
```

or longer timeouts without root-cause evidence.

Prefer:

```text
explicit state
locator auto-waiting
web-first assertions
application events
```

---

# 35. No Force Repair

Do not solve click failure with:

```ts
click({ force: true })
```

unless the business interaction explicitly requires it.

Force is not a general repair tool.

---

# 36. Repair Provenance

When a repair modifies Flow knowledge, preserve enough metadata to explain why.

Possible metadata:

```yaml
change_reason:

  type: locator_repair

  source_run: 2026-09-04T20-15-41+03-00

  affected_element: add_user_button

  previous_revision: 4
```

The exact schema may be defined separately.

---

# 37. Previous Run Immutability

Do not edit the Run that originally failed after repair.

The old Run represents historical truth:

```text
what happened under revision N
```

The repaired flow creates new Runs under revision N+1.

---

# 38. MCP During Repair

Use MCP only when necessary.

Preferred:

```text
Run evidence
→ Map
→ Screenshot
→ Trace
→ MCP
```

MCP may help:

```text
re-discover changed target
inspect current semantics
validate candidate locators
understand new control behavior
```

MCP refs remain exploration-only.

---

# 39. Repair Output

A repair action should clearly communicate:

```text
root cause
classification
files changed
Map revision change
Map state
targeted validation result
whether full revalidation is still required
```

Example:

```text
Root cause:
Primary locator outdated.

Changed:
create-user.map.yaml

Revision:
4 → 5

Status:
REVALIDATION_REQUIRED

Repair validation:
PASS

Next required:
Full VERIFY FLOW
```

---

# 40. Final Repair Rule

Never sacrifice test meaning for a green result.

The correct sequence is:

```text
Understand failure
→ preserve evidence
→ repair only confirmed automation defects
→ revalidate
```

A failing test that correctly reveals a product defect is more valuable than a passing test that hides it.