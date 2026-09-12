# VERIFY FLOW

## Purpose

`VERIFY FLOW` validates the locator resilience and executable integrity of an existing Flow revision.

Verification proves that:

```text
Primary locators work
Fallback locators work
Last Resort locators work
```

independently.

Verification is not the same as a normal regression Run.


## Workspace Readiness Gate

Before `VERIFY FLOW`, execute the workspace Runtime Readiness Gate.

Continue only when the workspace runtime reports `READY`.

---

# 1. When to Use

Use `VERIFY FLOW`:

- automatically after `BUILD FLOW`
- after `REPAIR FLOW`
- after `UPDATE FLOW`
- when Map status is `REVALIDATION_REQUIRED`
- when the user explicitly requests verification of an unverified current revision
- when a changed/repaired Flow is `REVALIDATION_REQUIRED` and locator health must be re-established

---


## State Contract

Official initial `verification` is valid only while the current revision is in:

```text
DRAFTED
PRIMARY_VALIDATED
FALLBACK_VALIDATED
```

and MUST execute the next required strategy in order:

```text
DRAFTED            → primary_only
PRIMARY_VALIDATED  → fallback_only
FALLBACK_VALIDATED → last_resort_only
```

`revalidation` is valid only while status is `REVALIDATION_REQUIRED` and likewise proceeds Primary → Fallback → Last Resort for the current revision.

If a Flow is already `VERIFIED`, `DEGRADED`, or `DEGRADED_CRITICAL`, do not start a new initial-verification cycle without a definition change. Use normal `RUN FLOW` for current health, or `REPAIR FLOW` / `UPDATE FLOW` when automation knowledge must change, followed by revalidation.

---

# 2. Do Not Use MCP by Default

`VERIFY FLOW` executes existing Playwright automation.

Do not perform MCP exploration during normal verification.

Use MCP only later if a verification failure requires investigation.

---

# 3. Verification Execution Modes

Verification uses three modes:

```text
primary_only
fallback_only
last_resort_only
```

Each mode is an independent Flow execution.

Official verification and revalidation MUST execute all TCs in the Flow.

Do not use a selected TC subset to advance official verification state. A targeted subset belongs to `repair_validation` and does not satisfy an official verification proof.

Run type rules:

```text
Initial/new Flow verification → type: verification
REVALIDATION_REQUIRED Flow   → type: revalidation
Targeted repair check        → type: repair_validation (not an official proof)
```

---

# 3.1 Runtime Invocation Matrix

Launch each verification strategy as a separate Playwright process/execution context with a fresh filesystem-safe Run ID.

Initial verification:

```text
Primary:
  AFB_RUN_ID=<unique id A>
  AFB_RUN_TYPE=verification
  AFB_EXECUTION_MODE=primary_only

Fallback:
  AFB_RUN_ID=<unique id B>
  AFB_RUN_TYPE=verification
  AFB_EXECUTION_MODE=fallback_only

Last Resort:
  AFB_RUN_ID=<unique id C>
  AFB_RUN_TYPE=verification
  AFB_EXECUTION_MODE=last_resort_only
```

For `REVALIDATION_REQUIRED`, use the same matrix with:

```text
AFB_RUN_TYPE=revalidation
```

Official verification/revalidation MUST run the complete Flow TC set, so omit `AFB_SELECTED_TCS` unless it explicitly contains every TC.

Do not reuse one `AFB_RUN_ID` across the three strategy executions.

For V1, run one Playwright project/browser at a time; a browser/project matrix is a sequence of separate Flow Runs.

---

# 4. Verification Run Files

Each execution writes a separate:

```text
runs/<timestamp>.yaml
```

Example:

```text
runs/
├── 2026-09-04T20-30-01+03-00.yaml
├── 2026-09-04T20-32-14+03-00.yaml
└── 2026-09-04T20-34-39+03-00.yaml
```

Never merge the three verification executions into one historical Run file.

---

# 5. Verify Current Revision

Read:

```yaml
metadata:
  revision: N
```

and:

```yaml
verification:
  current_revision: N
```

Verification applies only to that revision.

If Map revision changes during verification:

```text
STOP
```

and restart verification for the new revision.

---

# 6. Initial Verification

For a new Flow:

```text
status = DRAFTED
```

perform runs in order:

```text
1. Primary
2. Fallback
3. Last Resort
```

---

# 7. Primary Verification

Run:

```text
type: verification   # initial verification
# or: revalidation  # when status = REVALIDATION_REQUIRED
execution_mode: primary_only
```

In this mode:

```text
Primary locators ONLY
```

No Fallback or Last Resort may recover a failure.

---

## 7.1 Primary PASS

Initial state transition:

```text
DRAFTED
→ PRIMARY_VALIDATED
```

Update relevant locator validation statuses:

```text
primary → validated
```

and update:

```text
verification.latest_runs.primary
```

---

## 7.2 Primary FAIL

Do not attempt Fallback inside the same verification Run.

Record:

```text
failed TC
failed step
locator attempts
failure signal
evidence
```

Then diagnose.

If confirmed automation failure, repair may be performed according to Repair Policy.

Do not advance Map state.

---

# 8. Fallback Verification

Only after Primary verification succeeds for initial build, execute:

```text
type: verification   # initial verification
# or: revalidation  # when status = REVALIDATION_REQUIRED
execution_mode: fallback_only
```

Every mapped target must resolve using its Fallback locator.

Primary must not influence resolution.

Last Resort must not recover failures.

---

## 8.1 Fallback PASS

Initial transition:

```text
PRIMARY_VALIDATED
→ FALLBACK_VALIDATED
```

Update:

```text
fallback validation_status → validated
```

and:

```text
verification.latest_runs.fallback
```

---

## 8.2 Fallback FAIL

Remain:

```text
PRIMARY_VALIDATED
```

Diagnose and repair only when allowed.

Do not mark the whole Flow `BROKEN` solely because an initial candidate needs correction.

---

# 9. Last Resort Verification

Execute:

```text
type: verification   # initial verification
# or: revalidation  # when status = REVALIDATION_REQUIRED
execution_mode: last_resort_only
```

Every required mapped target must use Last Resort.

---

## 9.1 Last Resort PASS

Initial transition:

```text
FALLBACK_VALIDATED
→ VERIFIED
```

Update:

```text
last_resort validation_status → validated
```

and:

```yaml
verified_revision: <current_revision>
```

---

## 9.2 Last Resort Success Does Not Promote It

Last Resort remains Last Resort.

Successful verification proves:

```text
it can recover
```

not:

```text
it should be preferred
```

Normal execution still begins with Primary.

---

# 10. Revalidation Mode

If current Map status is:

```text
REVALIDATION_REQUIRED
```

verification behaves differently from initial build.

Run:

```text
Primary
Fallback
Last Resort
```

for the current revision.

But during the first two successful runs, Map remains:

```text
REVALIDATION_REQUIRED
```

Do not temporarily move to:

```text
PRIMARY_VALIDATED
FALLBACK_VALIDATED
```

Those are initial-build states.

---

# 11. Revalidation Completion

Only when all three required strategies pass for current revision:

```text
REVALIDATION_REQUIRED
→ VERIFIED
```

Update:

```yaml
verified_revision: current_revision
```

---

# 12. Verification Data Isolation

Each strategy execution must use data that does not invalidate the next execution.

For state-creating Flows:

```text
Primary run
→ data instance A

Fallback run
→ data instance B

Last Resort run
→ data instance C
```

or use safe cleanup/reset.

---

# 13. Do Not Misclassify Data Collision

Example:

```text
Fallback verification creates same email
already created by Primary verification
```

and application responds:

```text
Duplicate email
```

This does NOT prove Fallback locator failure.

Classify appropriately as:

```text
data/setup failure
```

and correct verification isolation.

---

# 14. TC Isolation

Verification still uses each TC as a real Playwright test.

Each independent TC gets isolated BrowserContext by default.

Verification mode changes locator selection, not test isolation.

---

# 15. Auth During Verification

Use the Flow's configured auth mode:

```text
inline
flow_scoped_shared
none
```

Do not reuse auth state from a previous Flow or previous Flow Run.

---

# 16. Interaction Stability

Verification mode changes only locator strategy.

Do NOT change interaction method between:

```text
Primary verification
Fallback verification
Last Resort verification
```

If Map says:

```text
fill()
```

all three locator strategy runs should still use `fill()`.

This ensures verification isolates locator resilience.

---

# 17. Assertions Remain Identical

Business expectations must remain identical across all locator-strategy verification runs.

Do not weaken assertions during Fallback or Last Resort verification.

---

# 18. No Automatic Locator Repair During Verification

If a locator fails:

```text
record
→ diagnose
→ repair explicitly
```

Do not silently generate and save a new locator while the verification continues.

---

# 19. Verification Failure Classification

A failed verification may be caused by:

```text
locator failure
application failure
data failure
auth failure
environment failure
interaction failure
automation code failure
```

Do not assume every failed verification means locator failure.

---

# 20. Application Failure During Verification

Example:

```text
Fallback locator correctly resolves Submit
click executes
backend returns 500
```

This does not prove Fallback locator invalid.

Record:

```text
application_failure
```

Map locator validation may remain logically valid where evidence is sufficient, but full verification of the affected business path may still be incomplete.

Do not repair locator to bypass the 500 response.

---

# 21. Evidence

On verification PASS:

```text
no screenshot by default
```

On verification FAIL:

```text
capture failure screenshot
retain Trace
record structured diagnostic data
```

---

# 22. Same-Flow Lock

Acquire Flow lock before verification.

All three verification runs for the same Flow should be serialized.

Prevent concurrent normal/repair/update Runs from mutating the same Map during verification.

---

# 23. Verification and Map Revision

Normal successful verification does not increase revision.

Verification validates the existing definition.

Only definition changes increase revision.

---

# 24. Repair During Initial Verification

If Fallback needs repair:

```text
update Fallback definition
revision++
```

Because automation definition changed.

The safest behavior is to evaluate which previously completed verification results remain valid for the new revision.

If the change is isolated to one locator strategy, the runtime/policy may preserve unaffected strategy evidence only when it can prove the change did not affect them.

When uncertain:

```text
run full verification
```

Prefer trustworthy verification over optimization.

---

# 25. Repair During Revalidation

Any definition modification during revalidation creates another new revision.

Restart required verification for that revision.

Do not verify mixed definitions from two revisions.

---

# 26. Result History

Every verification execution preserves:

```text
run type
execution mode
Map revision
Map status before
Map status after
TC results
failure classification
evidence references
```

Do not modify previous verification Runs.

---

# 27. Verification Summary

After completion, report:

```text
Flow
Map revision
Primary result
Fallback result
Last Resort result
final Map status
failed strategies if any
brittle locator count
warnings
```

Example:

```text
Flow: Create User
Revision: 4

Primary: PASS
Fallback: PASS
Last Resort: PASS

Status: VERIFIED
```

---

# 28. Partial Verification Summary

Example:

```text
Flow: Create User
Revision: 5

Primary: PASS
Fallback: FAIL
Last Resort: NOT RUN

Status: REVALIDATION_REQUIRED

Failure:
Fallback users-menu locator no longer resolves target.
```

Do not claim:

```text
VERIFIED
```

until required strategy validation is complete.

---

# 29. VERIFY FLOW Prohibitions

Do not:

```text
use MCP refs
use Fallback during Primary-only mode
change interactions between strategy runs
reuse state-created data unsafely
weaken assertions
auto-repair silently
mark application failure as locator failure
promote Last Resort automatically
skip required strategy verification
claim VERIFIED prematurely
```

---

# 30. Final VERIFY FLOW Rule

Verification answers:

> Can the current Flow revision execute the intended business scenarios using each required locator strategy independently?

Only when the answer is yes for all required strategies may the revision become `VERIFIED`.