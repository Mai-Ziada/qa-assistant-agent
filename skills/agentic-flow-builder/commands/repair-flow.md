# REPAIR FLOW

## Purpose

`REPAIR FLOW` repairs confirmed automation drift or automation implementation defects while preserving business expectations.

It must never turn product failures into green automation through weakened testing.


## Workspace Readiness Gate

Before any repair execution or mutation, execute the workspace Runtime Readiness Gate.

Continue only when the workspace runtime reports `READY`.

## When to Use

Use after a confirmed:

```text
locator failure
interaction implementation problem
automation code failure
navigation automation problem
technical assertion implementation issue
```

Usually after `ANALYZE FAILURE` or when equivalent diagnosis already exists.

## Do Not Repair Without Diagnosis

Before repair:

```text
read Run
read Map
confirm classification
review evidence
```

If classification is:

```text
application_failure
unknown
```

do not automatically repair.

## Repair Workflow

```text
1. Acquire Flow lock.

2. Load current Map.

3. Load relevant failed/degraded Run.

4. Confirm current revision.

5. Confirm failure classification.

6. Determine minimum safe change.

7. Use MCP only if required to discover corrected UI knowledge.

8. Modify the smallest necessary artifact.

9. Increase Map revision when definition changes.

10. Set REVALIDATION_REQUIRED.

11. Validate generated artifacts structurally.

12. Run targeted repair_validation when useful.

13. Run full VERIFY FLOW.

14. Release Flow lock after finalization.
```

## Repairable Areas

Potential repair targets:

```text
Primary/Fallback/Last Resort locator
interaction definition
assertion technical target
flow implementation
spec orchestration
data mapping
navigation helper
project runtime capability
```

Shared runtime changes require additional impact analysis.

## Locator Repair

When a locator is confirmed broken:

```text
re-explore target if needed
validate target contract
generate replacement candidate
apply Locator Policy
```

Do not modify unrelated locator tiers.

Any locator tier whose definition is changed by the repair MUST set:

```yaml
validation_status: pending
```

until that tier passes official revalidation for the new revision. Unchanged locator tiers may retain their existing locator-level validation status; Flow-level current-revision verification is still controlled by the three official revalidation proofs.

Example:

```text
Primary broken
Fallback valid
Last Resort valid
```

Repair:

```text
Primary only
```

where possible.

## Preserve Three-Locator Model

After repair, important elements must still maintain:

```text
Primary
Fallback
Last Resort
```

Do not solve one locator failure by reducing the Map to one working locator.

## Interaction Repair

If the interaction method is confirmed wrong, update it explicitly.

Example:

```text
fill()
→ pressSequentially()
```

only when evidence proves sequential keyboard events are required.

Then:

```text
revision++
REVALIDATION_REQUIRED
```

Do not create silent runtime interaction fallback.

## Assertion Repair

Repair an assertion only when its automation implementation is technically wrong.

Allowed:

```text
assertion points at wrong status element
```

Forbidden:

```text
Expected: Approved
Actual: Pending
→ change expected to Pending
```

unless the business requirement changed.

Business changes belong to `UPDATE FLOW`.

## Data Repair

If failure is caused by:

```text
duplicate data
stale record
wrong fixture
incorrect data ref
```

repair data mapping/setup.

Do not change UI automation unnecessarily.

## Runtime Repair

Before modifying:

```text
agentic-flow-builder/runtime/
```

determine whether the problem is infrastructure-level.

If Flow-specific:

```text
fix Map
flow.ts
spec.ts
```

where possible.

If runtime-level:

```text
modify workspace runtime intentionally
identify potentially affected Flows
perform impact analysis
```

Do not overwrite workspace runtime from the canonical Skill runtime.

## Workspace Runtime vs Canonical Runtime

Project repair may modify:

```text
<workspace>/agentic-flow-builder/runtime/
```

when required.

Do not automatically modify:

```text
<agent>/skills/agentic-flow-builder/runtime/
```

while repairing a project.

Promotion of project runtime improvements back to the canonical Skill is a separate maintenance activity.

## Minimum Change Principle

Prefer:

```text
one confirmed issue
→ one focused repair
```

Avoid unrelated refactoring during repair.

## Revision

If repair changes automation definition:

```text
revision N → N+1
```

Update:

```text
metadata.revision
verification.current_revision
updated_at
change_reason
```

## State After Repair

Set:

```text
REVALIDATION_REQUIRED
```

Do not immediately restore:

```text
VERIFIED
```

## Repair Validation Runtime Invocation

When a targeted repair check is executed, pass an explicit Run context:

```text
AFB_RUN_ID=<new unique run id>
AFB_RUN_TYPE=repair_validation
AFB_EXECUTION_MODE=<primary_only | fallback_only | last_resort_only>
AFB_SELECTED_TCS=<comma-separated impacted TC IDs>   # optional subset
```

`repair_validation` is targeted evidence only and never replaces official revalidation proofs.

## Repair Validation

A targeted validation may confirm the focused repair.

Example:

```text
Primary locator repaired

type: repair_validation
execution_mode: primary_only
```

A PASS proves the repair appears technically valid.

It does not restore full verification.

## Full Revalidation

Run:

```text
Primary
Fallback
Last Resort
```

for the new revision.

Only after all required verification succeeds:

```text
VERIFIED
```

## Failed Repair Validation

If targeted validation fails:

```text
record new Run
capture evidence
continue diagnosis
```

Do not overwrite the original failed Run.

Do not repeatedly mutate automation blindly.

## Application Failure During Repair Validation

If repaired automation executes correctly but application behavior fails:

```text
STOP changing automation
```

Classify/report the application failure.

## No Blind Retry

Do not introduce retries without root-cause evidence.

Especially for:

```text
Create
Submit
Approve
Delete
Pay
Transfer
Cancel
```

## No Fixed-Wait Repair

Do not solve repair problems with:

```ts
waitForTimeout(...)
```

Use actual application state.

## No Force Repair

Do not solve interaction failures with:

```ts
click({ force: true })
```

by default.

## Preserve History

Never edit:

```text
runs/<old-run>.yaml
```

Old Run:

```text
revision N
```

New repair validation:

```text
revision N+1
```

## Repair Provenance

Record why the definition changed.

Example:

```yaml
change_reason:

  type: locator_repair

  source_run: 2026-09-04T20-15-41+03-00

  affected_element: add_user_button

  previous_revision: 4

  description: >
    Primary test ID no longer resolves.
```

## Repair Output

Report:

```text
Classification
Root cause
Changed files
Changed elements
Revision before/after
Map state
Repair validation result
Full verification result
Remaining warnings
```

## Final Rule

`REPAIR FLOW` restores automation correctness.

It does not change the meaning of the test.