# State Policy

## Purpose

This policy defines the lifecycle states of a Flow Map and how they differ from execution results.

Two independent concepts must always remain separate:

```text
Automation Map Health
```

and:

```text
Flow Run Result
```

They answer different questions.

---

# 1. Map Health Question

Map status answers:

> How healthy and verified is the automation definition?

Examples:

```text
DRAFTED
VERIFIED
DEGRADED
BROKEN
REVALIDATION_REQUIRED
```

---

# 2. Run Result Question

Run result answers:

> What happened in this specific execution?

Examples:

```text
passed
partial_failed
failed
blocked
```

---

# 3. Do Not Mix Them

Example:

```text
Automation successfully interacts with application
but API returns 500.
```

Run:

```text
failed
```

or:

```text
partial_failed
```

Map:

```text
VERIFIED
```

The product failed.

The automation did not necessarily fail.

---

# 4. Supported Map States

V1 supports:

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

Store normalized machine values as lowercase or another consistent schema representation if desired, but display names may use uppercase.

---

# 5. DRAFTED

Meaning:

```text
Flow automation has been generated
but required verification has not yet completed.
```

Use only for new Flow revisions that have never completed initial verification.

Initial state after `BUILD FLOW`:

```text
DRAFTED
```

---

# 6. PRIMARY_VALIDATED

Meaning:

```text
Initial Primary-only verification passed.
```

Required condition:

```text
current revision Primary verification = PASS
```

but Fallback and Last Resort initial verification are not yet complete.

Transition:

```text
DRAFTED
→ PRIMARY_VALIDATED
```

---

# 7. FALLBACK_VALIDATED

Meaning:

```text
Initial Primary and Fallback verification succeeded.
```

Last Resort verification is still pending.

Transition:

```text
PRIMARY_VALIDATED
→ FALLBACK_VALIDATED
```

---

# 8. VERIFIED

Meaning:

```text
Required verification for the current revision completed successfully.
```

For initial build:

```text
Primary PASS
Fallback PASS
Last Resort PASS
```

Then:

```text
VERIFIED
```

Store:

```yaml
current_revision: 1
verified_revision: 1
```

---

# 9. DEGRADED

Meaning:

```text
Flow remains executable,
but Primary locator health has degraded.
```

Typical case:

```text
Primary fails
Fallback succeeds
```

Normal Run may result:

```text
passed_with_recovery
```

while Map becomes:

```text
DEGRADED
```

---

# 10. DEGRADED_CRITICAL

Meaning:

```text
Flow remains executable,
but only Last Resort recovery succeeded.
```

Typical case:

```text
Primary fails
Fallback fails
Last Resort succeeds
```

Automation is still running, but resilience is nearly exhausted.

Repair should be prioritized.

---

# 11. BROKEN

Meaning:

```text
Automation cannot reliably execute
required behavior due to confirmed automation failure.
```

Typical case:

```text
Primary fails
Fallback fails
Last Resort fails
```

and diagnosis confirms:

```text
locator_failure
automation_code_failure
or equivalent automation-owned failure
```

Do NOT use `BROKEN` for product/business failures.

---

# 12. REVALIDATION_REQUIRED

Meaning:

```text
Automation was previously verified,
but its definition changed.
```

Examples:

```text
locator changed
interaction changed
assertion implementation changed
flow steps changed
business definition changed
relevant runtime behavior changed
```

This state is different from:

```text
DRAFTED
```

because the Flow has prior verified history.

---

# 13. Revision Model

Each Flow Map has:

```yaml
revision: 5
```

and verification metadata such as:

```yaml
current_revision: 5
verified_revision: 4
```

This means:

```text
revision 4 was verified
revision 5 currently requires verification
```

---

# 14. When Revision Increases

Increase revision when automation knowledge or behavior changes.

Examples:

```text
locator definition changed
preferred interaction changed
assertion definition changed
flow steps changed
TC structure changes affecting automation
data mapping affecting execution changed
```

Do not increase revision simply because a Run occurred.

---

# 15. Runtime Health Changes vs Revision

Example:

```text
Primary locator fails during normal Run.
Fallback succeeds.
```

Map health becomes:

```text
DEGRADED
```

but locator definition has not yet changed.

Therefore revision does not necessarily increase at that moment.

Revision increases when the automation definition is repaired/modified.

---

# 16. Initial Verification State Machine

```text
BUILD FLOW

   ↓

DRAFTED

   ↓
Primary verification PASS

PRIMARY_VALIDATED

   ↓
Fallback verification PASS

FALLBACK_VALIDATED

   ↓
Last Resort verification PASS

VERIFIED
```

---

# 17. Initial Verification Failure

Example:

```text
DRAFTED
↓ Primary PASS
PRIMARY_VALIDATED
↓ Fallback FAIL
```

Remain:

```text
PRIMARY_VALIDATED
```

Do not advance.

After Fallback repair, rerun affected verification.

---

# 18. Revalidation State Machine

Previously:

```text
VERIFIED
revision = 4
```

Automation changes:

```text
revision = 5
status = REVALIDATION_REQUIRED
```

Then:

```text
Primary revalidation PASS
→ REVALIDATION_REQUIRED

Fallback revalidation PASS
→ REVALIDATION_REQUIRED

Last Resort revalidation PASS
→ VERIFIED
```

Do not use:

```text
PRIMARY_VALIDATED
FALLBACK_VALIDATED
```

as temporary states during revalidation.

Those states describe initial verification lifecycle.

---

# 19. Verified Revision

After revalidation:

```yaml
current_revision: 5
verified_revision: 5
status: verified
```

If verification is incomplete:

```yaml
current_revision: 5
verified_revision: 4
status: revalidation_required
```

---

# 20. Run Results

Supported aggregate Flow Run results:

```text
passed
passed_with_recovery
partial_failed
partial_blocked
failed
blocked
```

These describe one execution only.

---

# 21. passed

Use when:

```text
all selected TCs pass
and no locator recovery occurs
```

Example:

```text
TC01 PASS
TC02 PASS
TC03 PASS
```

Run:

```text
passed
```

Map normally remains:

```text
VERIFIED
```

---

# 22. passed_with_recovery

Use when:

```text
all selected business TCs pass
but locator recovery was required
```

Example:

```text
TC01 PASS
TC02 Primary fails → Fallback succeeds
TC03 PASS
```

Run:

```text
passed_with_recovery
```

Map:

```text
DEGRADED
```

or:

```text
DEGRADED_CRITICAL
```

depending on recovery strategy.

---

# 23. partial_failed

Use when:

```text
some executed TCs passed
and at least one executed TC failed
```

Example:

```text
TC01 PASS
TC02 FAIL
TC03 PASS
```

Run:

```text
partial_failed
```

Map status depends on failure classification.

---

# 24. partial_failed with Product Failure

Example:

```text
TC01 PASS
TC02 application_failure
TC03 PASS
```

Run:

```text
partial_failed
```

Map:

```text
VERIFIED
```

unless separate automation health degradation occurred.

---

# 25. partial_failed with Automation Failure

Example:

```text
TC01 PASS
TC02 confirmed automation failure
TC03 PASS
```

Run:

```text
partial_failed
```

Map may become:

```text
BROKEN
DEGRADED
DEGRADED_CRITICAL
```

depending on severity and recovery.

---

# 26. partial_blocked

Use when:

```text
some selected TCs passed
some selected TCs were blocked
and no executed failure requires partial_failed
```

Example:

```text
TC01 PASS
TC02 BLOCKED
TC03 PASS
```

Run:

```text
partial_blocked
```

---

# 27. failed

Use when requested execution materially failed without sufficient passing execution to represent the result as partial.

Examples may include:

```text
all executed TCs fail
single selected TC fails
```

Run result does not automatically dictate Map health.

---

# 28. blocked

Use when requested execution could not meaningfully execute.

Examples:

```text
environment unavailable
required auth infrastructure unavailable
required data cannot be prepared
global prerequisite unavailable
```

Do not use `failed` when behavior was never actually tested.

---

# 29. TC Results

Individual TC results should support:

```text
passed
failed
blocked
```

Unselected TCs are not assigned a result.

Do not mark them:

```text
blocked
```

simply because they were not selected.

---

# 30. Result Precedence

When aggregating selected TCs, use logical precedence.

Example:

```text
PASS + FAIL + BLOCKED
```

Result:

```text
partial_failed
```

because an executed failure exists.

Example:

```text
PASS + BLOCKED
```

Result:

```text
partial_blocked
```

Example:

```text
FAIL + FAIL
```

Result:

```text
failed
```

---

# 31. Recovery Precedence

If all business TCs pass but recovery occurs:

```text
passed_with_recovery
```

If some TCs fail:

```text
partial_failed
```

takes precedence over:

```text
passed_with_recovery
```

Recovery information remains recorded separately.

---

# 32. Application Failure Does Not Degrade Map

Example:

```text
locator resolved
interaction completed
application returned wrong status
```

Run may fail.

Map should remain:

```text
VERIFIED
```

unless automation failure is separately confirmed.

This distinction is mandatory.

---

# 33. Data Failure Does Not Automatically Degrade Map

If:

```text
test user already exists
```

because data setup was invalid:

```text
data_failure
```

Do not change Map locator health.

Repair data/setup instead.

---

# 34. Environment Failure Does Not Degrade Map

If:

```text
site unavailable
```

Map remains as previously known.

Do not infer:

```text
BROKEN
```

from environment outage.

---

# 35. Auth Failure Does Not Automatically Degrade Map

Authentication failure requires diagnosis.

Only change automation health if auth automation itself is confirmed broken.

---

# 36. Locator Validation Status

Each locator strategy may separately track:

```text
pending
validated
failed
```

Example after initial generation:

```text
Primary: pending
Fallback: pending
Last Resort: pending
```

After verification:

```text
Primary: validated
Fallback: validated
Last Resort: validated
```

---

# 37. Locator Failure During Normal Run

If Primary previously validated but later fails:

```text
Primary validation_status → failed
```

If Fallback succeeds:

```text
Map → DEGRADED
```

This observed health change does not itself increase revision until definition changes.

---

# 38. Repair Transition

Example:

```text
DEGRADED
↓ repair Primary locator
revision 4 → 5
```

Then:

```text
REVALIDATION_REQUIRED
```

not:

```text
VERIFIED
```

even if targeted repair validation passes.

---

# 39. Repair Validation Result

Targeted repair validation is not full verification.

Example:

```text
Primary repair validation PASS
```

Map remains:

```text
REVALIDATION_REQUIRED
```

until required strategies are revalidated.

---

# 40. UPDATE FLOW Transition

Intentional business change:

```text
VERIFIED
↓ UPDATE FLOW
revision++
REVALIDATION_REQUIRED
↓ VERIFY FLOW
VERIFIED
```

Do not preserve `VERIFIED` after modifying expected business behavior.

---

# 41. Runtime Changes

If shared workspace runtime changes in a way that may affect existing flows, determine impacted flows.

Affected verified flows may require:

```text
REVALIDATION_REQUIRED
```

Do not blindly mark every flow if the runtime change is clearly isolated to an unused capability.

Impact analysis should determine scope.

---

# 42. Same-Flow Concurrent State Changes

Same-Flow Runs are serialized in V1.

This prevents:

```text
Run A → DEGRADED
Run B → VERIFIED
```

from racing against each other.

State transitions must be evaluated against a stable Map version.

---

# 43. Run Records Preserve State Transition

Each Run should record:

```yaml
map_status_before: verified
map_status_after: degraded
```

and:

```yaml
status_transition:

  changed: true

  from: verified

  to: degraded

  reason: primary_locator_failed_fallback_recovered
```

This supports historical diagnosis.

---

# 44. State Change Reason

Every automatic Map state change should have an explicit reason.

Examples:

```text
primary_verification_passed
fallback_verification_passed
last_resort_verification_passed
primary_locator_failed_fallback_recovered
last_resort_locator_required
all_locator_strategies_failed
automation_definition_changed
business_flow_updated
runtime_change_requires_revalidation
```

Avoid unexplained status changes.

---

# 45. Run Immutability

A Run records historical state at execution time.

Do not edit old Run files if Map health later changes.

Example:

```text
Run 10:
Map VERIFIED

Run 20:
Map DEGRADED
```

Run 10 remains unchanged.

---

# 46. Current Truth vs History

Use:

```text
Flow Map
```

for current automation truth.

Use:

```text
runs/
```

for historical truth.

Do not turn Map into execution history.

Do not treat the latest Run as the entire Map definition.

---

# 47. SHOW FLOW Health

`SHOW FLOW` should derive current state primarily from the Map.

It may enrich output with:

```text
latest Run
latest result
latest recovery
known failed locator
```

from Run history.

---

# 48. LIST FLOWS Health

`LIST FLOWS` should display Map health independently from latest Run result.

Example:

```text
Flow          Map Status    Last Result
---------------------------------------
create-user   VERIFIED      partial_failed
checkout      DEGRADED      passed_with_recovery
search        VERIFIED      passed
```

This makes the distinction visible to users.

---

# 49. Final State Principle

Always preserve the distinction:

```text
Run Result
=
What happened this time?
```

and:

```text
Map Status
=
How trustworthy is the automation definition?
```

A good automation system needs both.