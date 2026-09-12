# UPDATE FLOW

## Purpose

`UPDATE FLOW` modifies an existing automated Flow because intended business behavior, requirements, TCs, or journey structure intentionally changed.

This command is not failure self-healing.


## Workspace Readiness Gate

Before `UPDATE FLOW` mutates or executes automation, execute the workspace Runtime Readiness Gate.

Continue only when the workspace runtime reports `READY`.

## When to Use

Use when the user provides an intentional change such as:

```text
new business step
removed step
new validation
changed expected result
new role
changed workflow
new TC
removed TC
changed data requirements
new page/module in journey
```

## REPAIR vs UPDATE

Use:

```text
REPAIR FLOW
```

when:

> Automation no longer correctly implements the same intended business behavior.

Use:

```text
UPDATE FLOW
```

when:

> Intended business behavior itself changed.

## Supported Update Inputs

Updates may come from:

```text
chat instruction
updated document
new PRD
updated User Story
changed TCs
new TCs
mixed sources
```

Normalize supplied changes before modifying automation.

## Conflict Priority

Use:

```text
1. Explicit current user instruction
2. Updated/provided TCs
3. Updated business document
4. Existing Map
5. Observed UI
```

Observed UI does not become a requirement automatically.

## Load Existing Flow

Read:

```text
Map
flow.ts
spec.ts
latest relevant Runs
```

to understand current automation and history.

## Build Change Definition

Normalize the update into:

```text
added
removed
modified
unchanged
```

areas.

Example:

```text
Added:
STEP-04 Select Department

Modified:
Create User expected result

Added TC:
TC-CU-05 Department required

Unchanged:
Authentication
Users navigation
```

## Impact Analysis

Determine impacted:

```text
steps
TCs
elements
locators
target contracts
interactions
assertions
data
auth
navigation
runtime capability
```

Do not rebuild unaffected areas unnecessarily.

## Reuse Existing Knowledge

Preserve valid:

```text
locators
target contracts
components
steps
assertions
data refs
```

when still applicable.

`UPDATE FLOW` is not a reason to regenerate all locators.

## Use MCP Selectively

Use MCP for:

```text
new UI areas
changed pages
new controls
changed workflow paths
uncertain current semantics
```

Do not re-explore the entire application for a localized change.

## Current UI vs Requirement

If updated requirement says:

```text
Department field is now mandatory.
```

but the current UI does not contain the field:

```text
do not silently remove the requirement
```

Preserve intended behavior and surface the application mismatch.

## Modify Steps

Update ordered Flow steps first.

The Map must remain understandable as a business journey before technical details.

## Modify Test Cases

Each resulting TC remains a real:

```ts
test(...)
```

Add/remove/update TCs based on intended coverage.

Do not create artificial cross-TC dependency.

## Modify Element Knowledge

For new elements define:

```text
target_contract
Primary
Fallback
Last Resort
interaction
assertions
```

according to Skill policies.

Remove old elements only when no remaining TC or step uses them.

## Locator Changes From Intentional UI Changes

If an intentional requirement changes the UI target:

```text
update locator definition
set the changed locator tier validation_status = pending
revision++
```

Unchanged locator tiers may retain their locator-level status, but the new revision still requires complete official revalidation before the Flow returns to `VERIFIED`.

This remains `UPDATE FLOW`, because the cause is intentional product change.

## Modify Assertions

Expected business behavior may change only because updated input establishes the new intended behavior.

Do not derive expected behavior solely from current application output.

## Modify Data References

If new behavior needs:

```text
new role
new entity
new state
new input field
```

update project data references.

Continue using the project's existing data architecture.

## Runtime Impact

If the requirement needs a genuinely reusable runtime capability:

```text
evaluate workspace runtime extension
```

Do not inject Flow-specific hacks into shared runtime.

## Revision

Every intentional Flow-definition update requires:

```text
revision++
```

Example:

```text
revision 5 → 6
```

## State

After update:

```text
REVALIDATION_REQUIRED
```

Do not retain `VERIFIED`.

## Preserve Verified Revision

Before:

```yaml
current_revision: 5
verified_revision: 5
```

After:

```yaml
current_revision: 6
verified_revision: 5
status: revalidation_required
```

## Preserve Run History

Do not delete:

```text
runs/
```

Old Runs remain historical truth for their revisions.

## Change Provenance

Record:

```text
type: business_flow_update
previous_revision
description
```

and source information when useful.

## Validate Updated Artifacts

Before execution:

```text
validate Map schema
validate step references
validate TC references
validate assertions
validate data refs
validate TypeScript structure
```

## VERIFY FLOW

After update, automatically execute:

```text
VERIFY FLOW
```

for the new revision.

## Revalidation Rules

During:

```text
Primary PASS
Fallback PASS
```

Map remains:

```text
REVALIDATION_REQUIRED
```

After:

```text
Last Resort PASS
```

Map becomes:

```text
VERIFIED
```

## Application Failure During Updated Verification

If the new intended behavior is not implemented correctly:

```text
record application failure
capture evidence
do not rewrite requirement
```

Do not claim successful verification when the required business path could not be proven.

## Update Output

Report:

```text
Flow
previous revision
new revision
changed steps
changed TCs
changed elements
reused knowledge
new knowledge
Map status
verification results
application mismatches
warnings
```

## Prohibitions

Do not:

```text
delete Run history
regenerate all locators unnecessarily
change expected behavior based only on current UI
share runtime state with another Flow
silently modify runtime
skip revalidation
mark new revision VERIFIED before verification
```

## Final Rule

`UPDATE FLOW` changes automation because the intended Flow changed.

It preserves history, reuses valid knowledge, and verifies the new revision independently.