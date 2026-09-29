# ANALYZE FAILURE

## Purpose

`ANALYZE FAILURE` investigates an existing Flow execution failure without modifying automation.

It answers:

> What failed, where did it fail, why did it most likely fail, and what should happen next?

This command is strictly read-only unless the user separately requests repair or update.


## Readiness Rule

Reading existing Run/Map/evidence does not require the full Runtime Readiness Gate.

If analysis requires reproducing the failure through a new execution, run the Readiness Gate first and create a new Run record; never mutate the historical Run being analyzed.

## When to Use

Use when:

- a TC failed
- a Flow Run is `partial_failed`
- a Flow Run is `failed`
- a locator recovery occurred and deeper investigation is requested
- Map health became `DEGRADED`
- Map health became `DEGRADED_CRITICAL`
- Map became `BROKEN`
- failure classification is `unknown`
- the user asks why a Run failed

## Inputs

May receive:

```text
Flow name
Run ID
TC ID
failure description
```

If no Run ID is supplied, inspect the latest relevant failed or degraded Run for that Flow.

Do not assume the latest successful Run is relevant to the investigation.

## Read-Only Rule

`ANALYZE FAILURE` MUST NOT modify:

```text
Flow Map
flow.ts
spec.ts
runtime
old Run YAML files
test data definitions
expected results
```

It may create a new analysis/reproduction Run only when reproduction is necessary.

## Investigation Order

Use evidence in this order:

```text
1. Relevant Run YAML
2. Current Flow Map
3. Referenced screenshot
4. Referenced Trace
5. Relevant project data/config
6. MCP re-exploration when needed
```

Do not begin with MCP if structured evidence already explains the failure.

## Identify Execution Context

Determine:

```text
Run ID
Map revision
Map status at execution
run type
execution mode
selected TCs
browser/environment
actor role
auth mode
```

This prevents diagnosing a failure against the wrong revision.

## Identify Failed Scope

Determine:

```text
failed TC
failed step
affected element
failure phase
locator strategy
interaction
assertion
navigation state
data reference
```

## Locator Analysis

Review:

```text
Primary
Fallback
Last Resort
target contract
locator validation status
actual attempts
recovery result
```

Determine:

```text
Did the locator resolve?
Was the result unique?
Did it satisfy target_contract?
Was the correct target already resolved?
```

Do not classify something as a locator failure merely because the test later failed.

## Interaction Analysis

If the target resolved, inspect:

```text
preferred interaction
target actionability
whether interaction completed
whether application responded
```

Possible classifications include:

```text
interaction_failure
application_failure
data_failure
```

Do not automatically recommend another interaction method.

## Assertion Analysis

Compare:

```text
expected
actual
target
business source
```

Determine whether the problem is:

```text
application behavior
test data
wrong precondition
incorrect automation target
outdated expected behavior
```

Observed UI alone must not redefine expected behavior.

## Network Analysis

When relevant inspect:

```text
request sent?
method
endpoint
response status
timing
```

Example:

```text
Target resolved ✅
Submit interaction completed ✅
POST sent ✅
HTTP 500 ❌
```

Likely classification:

```text
application_failure
```

not locator failure.

## Auth Analysis

Determine whether:

```text
login executed
auth state created
credentials/data reference resolved
session unexpectedly expired
auth service failed
```

Differentiate between:

```text
auth automation problem
invalid data
application auth bug
environment outage
```

## Data Analysis

Check whether:

```text
required fixture exists
unique data collided
record already changed state
verification reused state incorrectly
data ref is stale
```

A duplicate created by previous verification is a data-isolation problem, not a locator problem.

## Environment Analysis

Detect:

```text
site unavailable
DNS/network failure
service outage
dependency failure
test environment problem
```

Do not recommend automation repair for infrastructure outage.

## Trace Use

Trace is secondary deep evidence.

Use it to determine:

```text
What happened before failure?
What target resolved?
Did the click execute?
Did navigation occur?
Was an overlay present?
Was the request sent?
What changed in the DOM?
```

Trace does not itself grant permission to modify automation.

## MCP Re-Exploration

Use MCP only when existing evidence cannot answer the question.

MCP may help determine:

```text
current target semantics
UI drift
changed attributes
current navigation
control behavior
new component structure
```

MCP refs remain temporary.

Do not modify the Flow while executing `ANALYZE FAILURE`.

## Scope of Investigation — When Reproduction Is Already Required

If reproducing the failure requires driving the application into a specific state via MCP, before
closing the investigation: check the current Flow Map for other elements reachable from that same
state whose locator `validation_status` is `pending` for the tier under test (e.g. all
`last_resort` locators for the TC downstream of the current step, when diagnosing a
`last_resort_only` failure). Inspect those in the same session if reaching them requires no
meaningfully different setup.

This does not license repairing anything without evidence — Classification still applies per
element — it only extends what gets *investigated* in one reproduction, since reaching the state is
the expensive part, not checking one extra element once there.

## Classification

Return one primary classification:

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

Use `unknown` when evidence is insufficient.

## Root Cause Confidence

Optionally indicate:

```text
high
medium
low
```

Example:

```text
classification: locator_failure
confidence: high
```

when:

```text
Primary = 0 matches
Fallback = correct target
target_contract confirmed
```

## Recommended Action

Possible recommendations:

```text
none
report_application_failure
repair_locator
repair_interaction
repair_automation_code
repair_data
investigate_auth
investigate_environment
update_flow
revalidate_flow
manual_review
```

Recommend `UPDATE FLOW` only when intended business behavior or requirements actually changed.

## Output

Return:

```text
Flow
Run
Map revision
TC
Step
Classification
Confidence
Observed behavior
Expected behavior
Locator analysis
Interaction state
Relevant network/application evidence
Evidence reviewed
Recommended action
Automation repair allowed: yes/no
```

## Final Rule

`ANALYZE FAILURE` explains.

It does not fix.