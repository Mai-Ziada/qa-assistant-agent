# RUN FLOW

## Purpose

`RUN FLOW` performs normal execution of an existing generated Flow.

It uses the verified Flow Knowledge Map, Playwright Flow implementation, and workspace runtime.

Normal execution should be deterministic and should not require MCP exploration.


## Workspace Readiness Gate

Before `RUN FLOW`, execute the workspace Runtime Readiness Gate.

Continue only when the workspace runtime reports `READY`.

If readiness fails, stop before starting Playwright execution and report the exact incompatibility.

---

# 1. When to Use

Use `RUN FLOW` when:

- the Flow already exists
- the user wants to execute automated TCs
- regression execution is requested
- a specific TC subset should run
- current behavior should be checked using existing automation

---

# 2. Pre-Run Checks

Before executing:

```text
locate Flow folder
load Flow Map
validate Map structure
load current revision
inspect Map state
validate requested TC selection
acquire Flow lock
```

---

# 3. Map State Handling

Preferred normal execution state:

```text
VERIFIED
```

Normal execution is also allowed for:

```text
DEGRADED
DEGRADED_CRITICAL
```

Normal `RUN FLOW` is NOT allowed while the Map is:

```text
DRAFTED
PRIMARY_VALIDATED
FALLBACK_VALIDATED
REVALIDATION_REQUIRED
BROKEN
```

Use `VERIFY FLOW`, `REPAIR FLOW`, or `UPDATE FLOW` as appropriate before normal execution.

If the Map is in any disallowed state, STOP before Playwright execution and report the current state plus the required next action.

Do not downgrade this rule to a warning and do not execute the current revision as a normal trusted Run.

---

# 3.1 Runtime Invocation

Before launching the generated Playwright spec, create a new filesystem-safe Run ID and pass the execution context through the process environment:

```text
AFB_RUN_ID=<new unique run id>
AFB_RUN_TYPE=normal
AFB_EXECUTION_MODE=normal
AFB_SELECTED_TCS=<comma-separated selected TC IDs>   # only for a subset
```

For an all-TC Run, omit `AFB_SELECTED_TCS`.

When selecting a subset, also pass Playwright `--grep "<TC-ID> -"` (alternate with `|` for more
than one TC id), so a spec generated before TCs were declared through `flowTest(...)` still skips
instantiating the unselected TCs' fixtures:

```text
AFB_SELECTED_TCS=TC05 npx playwright test <flow-dir> --grep "TC05 -"
```

Never pass `--grep` without `AFB_SELECTED_TCS` set to the same TCs -- the runtime would still
expect every TC in the Map, the Run would never finalize, and the session/lock would be left behind.

Never reuse an `AFB_RUN_ID` for another logical Run. The same Run ID may be observed again only by Playwright worker replacement/retry processes belonging to that same Run.

For V1, select one Playwright project/browser for the command. Browser/project matrices are separate sequential Flow Runs.

---

# 4. Execution Mode

Normal Runs use:

```text
type: normal
execution_mode: normal
```

---

# 5. TC Structure

Each selected TC executes as a real Playwright:

```ts
test(...)
```

Do not merge independent TCs into one test during runtime.

---

# 6. TC Selection

Support:

```text
all TCs
```

or selected TCs.

Example:

```text
RUN FLOW create-user TC-CU-03
```

Only selected TCs belong to that Flow Run.

Unselected TCs are not:

```text
passed
failed
blocked
```

They were not executed.

---

# 7. Flow Run Session

Create one logical Run ID for the requested Flow execution.

Example:

```text
2026-09-04T20-45-11+03-00
```

Aggregate selected Playwright TC results under this Run ID.

Example:

```text
Run
├── TC-CU-01 PASS
├── TC-CU-02 FAIL
└── TC-CU-03 PASS
```

creates one:

```text
runs/<run-id>.yaml
```

---

# 8. Test Isolation

Each independent TC gets a fresh BrowserContext by default.

Do not share browser/page state across independent TCs.

---

# 9. Authentication

Use Map auth configuration:

```text
inline
flow_scoped_shared
none
```

Cross-flow authentication state sharing remains forbidden.

---

# 10. Data Resolution

Resolve test data through project data architecture.

Do not hardcode credentials or test entities in `spec.ts`.

For selected TCs, prepare only the required data where practical.

---

# 11. Normal Locator Resolution

For each mapped target:

```text
Primary
```

is attempted first.

---

# 12. Primary Success

If Primary resolves the correct target:

```text
validate target contract
→ use target
→ execute preferred interaction
```

Do not also test Fallback during normal execution.

---

# 13. Primary Target-Resolution Failure

Only when target resolution fails may runtime try:

```text
Fallback
```

Examples:

```text
0 matches
unexpected ambiguous matches
candidate does not satisfy target contract
Primary no longer identifies intended target
```

---

# 14. Fallback Success

If Fallback resolves the valid target:

```text
continue Flow
record recovery
```

The TC may still pass.

Aggregate Run may become:

```text
passed_with_recovery
```

if no business failures occur.

Map health becomes:

```text
DEGRADED
```

---

# 15. Fallback Failure

If Fallback also fails target resolution:

```text
try Last Resort
```

---

# 16. Last Resort Success

If Last Resort resolves the intended target:

```text
continue Flow
record recovery
Map health → DEGRADED_CRITICAL
```

A successful business execution does not make automation healthy.

---

# 17. All Locator Strategies Fail

If:

```text
Primary
Fallback
Last Resort
```

all fail to resolve the intended target:

```text
emit structured locator failure signal
```

After diagnosis confirms automation-owned locator failure:

```text
Map → BROKEN
```

---

# 18. Locator Fallback Boundary

Do NOT switch locator when Primary already resolved the intended target but:

```text
button is disabled
element is covered
click cannot execute
API fails
business validation fails
assertion mismatch occurs
form validation appears
navigation result is wrong
```

These require diagnosis outside locator recovery.

---

# 19. Interaction Execution

Always use the Map's:

```text
preferred interaction
```

Do not automatically switch interaction methods.

Example:

```text
fill() fails
```

must not become:

```text
pressSequentially()
```

without diagnosis and Map change.

---

# 20. No Fixed Waits

Do not inject fixed waits during Run execution to rescue flaky behavior.

Use runtime/Playwright state-based synchronization.

---

# 21. No Blind Retry

Do not blindly repeat:

```text
Create
Submit
Approve
Pay
Delete
Transfer
Cancel
```

after ambiguous failure.

Determine whether the first action reached the application/backend.

---

# 22. Assertion Execution

Execute mapped assertions against intended mapped targets.

Record:

```text
expected
actual
target
step
```

when assertion fails.

---

# 23. Failure Signal

When a step cannot continue, emit structured information such as:

```text
TC
step
element
phase
locator strategy
interaction
actual state
error
```

Do not swallow failure through generic catch/continue behavior.

---

# 24. Continue Independent TCs

A failure in one TC should not automatically prevent unrelated independent TCs from running.

Example:

```text
TC01 FAIL
TC02 independent → RUN
TC03 independent → RUN
```

This enables accurate partial results.

---

# 25. Blocked TCs

If a TC genuinely cannot execute because required state/prerequisite is unavailable:

```text
blocked
```

Do not report it as functional failure if its business behavior was never tested.

---

# 26. Failure Diagnosis

After execution failures, the Runner/Diagnosis Engine classifies:

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

Do not automatically repair during `RUN FLOW`.

---

# 27. Application Failure

Example:

```text
target resolved
click completed
POST sent
response 500
```

Record:

```text
application_failure
automation repair_required: false
```

Map health remains unchanged unless a separate automation issue exists.

---

# 28. Evidence

Passing TC:

```text
no screenshot by default
```

Failed TC:

```text
capture failure screenshot
retain Trace
record evidence path
```

Do not capture screenshots for every step.

---

# 29. PASS_WITH_RECOVERY Evidence

If all business behavior passes but Fallback/Last Resort recovery occurs:

```text
no screenshot by default
```

Structured recovery data is sufficient for normal history.

---

# 30. Run Result Aggregation

Supported Flow Run results:

```text
passed
passed_with_recovery
partial_failed
partial_blocked
failed
blocked
```

---

# 31. passed

Use when:

```text
all selected TCs pass
locator_recoveries = 0
```

---

# 32. passed_with_recovery

Use when:

```text
all selected TCs pass
and locator recovery > 0
```

---

# 33. partial_failed

Use when:

```text
at least one executed TC passed
and at least one executed TC failed
```

Example:

```text
PASS
FAIL
PASS
```

---

# 34. partial_blocked

Use when:

```text
one or more TCs pass
one or more TCs blocked
zero TCs failed
```

---

# 35. failed

Use when requested execution materially fails without passing coverage that makes the result partial.

Example:

```text
single selected TC = FAIL
```

or:

```text
all executed TCs = FAIL
```

---

# 36. blocked

Use when requested execution could not meaningfully test intended behavior.

---

# 37. Failure Precedence

Example:

```text
PASS
FAIL
BLOCKED
```

Result:

```text
partial_failed
```

An executed failure takes precedence over partial blocking.

---

# 38. Recovery and Failure Together

Example:

```text
TC01 PASS using Fallback
TC02 application FAIL
TC03 PASS
```

Aggregate result:

```text
partial_failed
```

not:

```text
passed_with_recovery
```

Recovery information remains separately recorded.

---

# 39. Map Health Evaluation

Run result does not directly dictate Map state.

Evaluate automation health separately.

---

## 39.1 Product Failure

```text
Run = partial_failed
Map = VERIFIED
```

may be valid.

---

## 39.2 Primary Recovery

```text
Run = passed_with_recovery
Map = DEGRADED
```

---

## 39.3 Last Resort Recovery

```text
Run = passed_with_recovery
Map = DEGRADED_CRITICAL
```

---

## 39.4 Confirmed Automation Breakdown

```text
Run = failed / partial_failed
Map = BROKEN
```

when diagnosis confirms automation cannot execute required behavior.

---

# 40. Run YAML

After aggregation, write:

```text
<flow>/runs/<run-id>.yaml
```

The Run must contain:

```text
identity
type
execution mode
Map revision
Map status before/after
TC results
step results
recoveries
failures
classification
evidence
status transition
agent summary
```

---

# 41. Run Immutability

After finalization:

```text
do not modify Run YAML
```

Future Runs describe future state.

---

# 42. Update Current Map Health

After Run result and diagnosis are finalized, evaluate state transition through Map State Manager.

Do not let individual TC code directly modify Map status.

---

# 43. Revision During Normal Run

Normal execution does not increase Map revision.

Example:

```text
Primary fails
Fallback works
```

Health may become:

```text
DEGRADED
```

but definition revision remains unchanged until repair changes locator knowledge.

---

# 44. Runtime Lock

Hold same-Flow lock while execution/session state and Map health are being finalized.

Release lock after:

```text
Run file finalized
Map transition completed
temporary auth/data cleaned
```

---

# 45. Cleanup

Clean temporary:

```text
Flow-scoped auth
Run-scoped setup
temporary files
safe test data
```

according to project/runtime policy.

Do not perform broad destructive cleanup.

---

# 46. Cleanup Failure

If business scenario passed but cleanup fails:

```text
preserve business result
record cleanup/runtime issue separately
```

Do not rewrite a correct business outcome solely because cleanup infrastructure failed.

---

# 47. RUN FLOW Summary

Return concise information:

```text
Flow
Run ID
Map revision
Map status
selected TCs
passed
failed
blocked
Run result
locator recoveries
failure classifications
evidence locations
recommended next action
```

---

# 48. Recommended Next Actions

Examples:

Application failure:

```text
ANALYZE FAILURE / report product issue
```

Primary locator recovery:

```text
REPAIR FLOW recommended
```

Map status:

```text
REVALIDATION_REQUIRED
```

should suggest:

```text
VERIFY FLOW
```

Do not auto-trigger repair from `RUN FLOW` unless the higher-level command explicitly requested repair behavior.

---

# 49. RUN FLOW Prohibitions

Do not:

```text
use MCP by default
change locator definitions during Run
change interactions during Run
weaken assertions
silently auto-repair
share cross-flow sessions
capture screenshots on every step
blindly retry state-changing actions
change expected behavior to match application output
overwrite previous Run history
```

---

# 50. Final RUN FLOW Rule

`RUN FLOW` answers:

> What happens when the current automation executes the selected business tests now?

It must preserve both:

```text
business execution truth
```

and:

```text
automation health truth
```

without confusing one for the other.