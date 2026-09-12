# Evidence Policy

## Purpose

This policy defines when `agentic-flow-builder` captures, retains, organizes, references, and uses execution evidence.

Evidence exists to answer:

```text
What actually happened?
```

It should support both:

- human investigation
- agent diagnosis

without creating unnecessary storage or noise.

---

# 1. Core Evidence Principle

Do not capture evidence merely because automation executed.

Capture evidence when it adds diagnostic or reporting value.

Default model:

```text
PASS
→ minimal structured Run data

FAIL
→ structured Run data + failure evidence
```

---

# 2. Evidence Types

Potential evidence includes:

```text
screenshots
Playwright traces
network observations
console errors
runtime errors
current URL
resolved locator information
locator attempts
assertion expected/actual values
interaction state
page/application state
```

Not all evidence types are required for every failure.

Capture what is useful for diagnosis.

---

# 3. Structured Run Data Is Primary

For agent analysis, the primary evidence source is:

```text
runs/<timestamp>.yaml
```

The Run YAML should contain structured information such as:

```text
failed TC
failed step
element
locator strategy
locator attempts
interaction method
assertion expected/actual
failure signal
classification
network observation when relevant
Map revision
evidence references
```

Prefer structured facts over forcing the agent to infer everything from screenshots.

---

# 4. Evidence Investigation Order

Default diagnostic order:

```text
1. Run YAML
2. Flow Map
3. Screenshot
4. Trace
5. MCP re-exploration when needed
```

Do not begin every failure investigation by replaying the UI.

Use existing evidence first.

---

# 5. Screenshot Policy

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

Screenshots should primarily represent the failure state.

---

# 6. Why No Step-by-Step Screenshots

Avoid:

```text
STEP-01.png
STEP-02.png
STEP-03.png
STEP-04.png
...
```

for successful flows.

This creates:

- excessive storage
- noisy evidence
- difficult browsing
- little diagnostic value
- unnecessary runtime overhead

Use Trace for deep timeline inspection when needed.

---

# 7. Failure Screenshot

On failure, capture the application state as close as possible to the failure.

Recommended naming:

```text
<TC-ID>-<short-failure-name>.png
```

Example:

```text
TC-CU-03-duplicate-email.png
```

Avoid generic:

```text
failed.png
screenshot.png
error.png
```

when multiple failures may exist.

---

# 8. Screenshot Scope

Prefer full-page or viewport screenshot depending on diagnostic value.

If failure is localized to a component and a targeted screenshot would materially help, runtime may optionally support element-specific evidence.

V1 should prioritize reliable failure capture over sophisticated screenshot cropping.

---

# 9. Trace Policy

Trace is deep diagnostic evidence.

It is valuable for:

### Humans

To inspect:

```text
timeline
DOM snapshots
action sequence
network
console
source
errors
timings
```

### Agent

To investigate ambiguous failures when structured Run data and screenshots are insufficient.

Trace is secondary evidence for the agent.

---

# 10. Trace Retention

Preferred policy:

```text
instrument execution
↓
PASS
→ discard trace

FAIL
→ retain trace
```

Do not retain traces for all successful Runs by default.

---

# 11. PASS_WITH_RECOVERY Trace

If:

```text
Primary failed
Fallback succeeded
Flow passed
```

do not automatically retain Trace in V1.

Run YAML should already record:

```text
Primary failure
Fallback success
affected element
affected step
```

If deeper analysis is required, the agent may reproduce the issue under an analysis/repair execution with Trace retention.

---

# 12. Business/Application Failure Evidence

If automation correctly executed but the application behavior is wrong:

```text
capture evidence
```

Example:

```text
target resolved
click executed
request sent
API returned 500
```

Evidence may include:

```text
failure screenshot
network response metadata
Trace
relevant UI error
```

This evidence supports product failure reporting.

It MUST NOT automatically trigger automation repair.

---

# 13. Automation Failure Evidence

If diagnosis suggests automation failure:

```text
locator failure
interaction implementation issue
automation code error
navigation automation issue
```

capture evidence useful for repair.

Examples:

```text
current screenshot
locator attempts
target contract
resolved candidates
runtime error
Trace
current URL
```

---

# 14. Locator Failure Evidence

For locator-related failure, Run YAML should record:

```yaml
locator_attempts:

  - strategy: primary
    result: failed
    reason: no_matching_element

  - strategy: fallback
    result: passed
```

The agent should not need to visually inspect a screenshot merely to learn which locator failed.

Screenshot/Trace support deeper investigation.

---

# 15. Assertion Failure Evidence

Record both:

```text
expected
actual
```

and the intended target.

Example:

```yaml
assertion:

  target: request_status

  expected: Approved

  actual: Pending
```

Avoid evidence that merely says:

```text
Assertion failed
```

without context.

---

# 16. Network Evidence

Network evidence may be recorded when it is relevant to failure diagnosis.

Examples:

```text
request method
endpoint
response status
request timing
whether request was sent
```

Avoid storing full sensitive payloads unless explicitly safe and required.

---

# 17. Sensitive Network Data

Do NOT persist:

```text
Authorization headers
cookies
access tokens
passwords
secret request bodies
personal secrets
```

in Run YAML or evidence logs.

If useful diagnostic data contains sensitive fields, redact them.

---

# 18. Console Evidence

Console errors may be captured when useful.

Do not store every console message by default.

Prioritize:

```text
errors
uncaught exceptions
relevant warnings
```

associated with the failed execution.

---

# 19. Evidence Location

Use the project's existing evidence architecture.

Do not create a competing root when an evidence root already exists.

Add:

```text
<existing-evidence-root>/
└── agentic-flow-builder/
```

Example:

```text
evidences/
└── agentic-flow-builder/
    └── create-user/
        └── 2026-09-04T20-15-41+03-00/
```

---

# 20. Evidence Folder Structure

Preferred hierarchy:

```text
<evidence-root>/
└── agentic-flow-builder/
    └── <flow-name>/
        └── <run-id>/
            ├── <failed-tc>.png
            ├── trace.zip
            └── <other relevant diagnostic artifact>
```

This provides:

```text
Skill
→ Flow
→ Run
→ Failure evidence
```

---

# 21. Multiple TC Failures

If multiple TCs fail in one Flow Run:

```text
RUN/
├── TC-01-failure.png
├── TC-04-failure.png
├── TC-06-failure.png
└── ...
```

Avoid overwriting evidence.

---

# 22. Run References to Evidence

Run YAML should reference evidence paths.

Example:

```yaml
evidence:

  captured: true

  items:

    - type: screenshot

      test_case: TC-CU-03

      path: >
        ../../evidences/agentic-flow-builder/create-user/
        2026-09-04T20-15-41+03-00/
        TC-CU-03-duplicate-email.png

    - type: trace

      path: >
        ../../evidences/agentic-flow-builder/create-user/
        2026-09-04T20-15-41+03-00/
        trace.zip
```

Do not require the agent to search the filesystem blindly.

---

# 23. Evidence Path Portability

Prefer paths that can be resolved from known project/Flow context.

Do not hardcode developer-machine absolute paths such as:

```text
C:\Users\Mai\Desktop\...
```

inside committed Flow knowledge or Run history unless the workspace architecture explicitly requires absolute runtime paths.

Prefer workspace-relative references.

---

# 24. Evidence for Verification Runs

Verification Runs follow the same policy.

```text
Primary verification PASS
→ no screenshot

Fallback verification PASS
→ no screenshot

Last Resort verification PASS
→ no screenshot

Any verification failure
→ failure evidence
```

---

# 25. Evidence for Repair Validation

If repair validation passes:

```text
no screenshot by default
```

If repair validation fails:

```text
capture evidence
```

The failure becomes part of diagnosis for the attempted repair.

---

# 26. Evidence for Revalidation

Same policy:

```text
PASS
→ structured Run only

FAIL
→ screenshot + retained Trace according to runtime policy
```

---

# 27. ANALYZE FAILURE Behavior

`ANALYZE FAILURE` should first consume existing evidence.

Do not create new evidence unless:

```text
existing evidence is insufficient
and reproduction is required
```

If reproduction occurs, create a new execution/analysis record rather than modifying the original Run.

---

# 28. Immutable Evidence Context

Evidence belongs to the execution that generated it.

Do not silently replace:

```text
Run A screenshot
```

with:

```text
Run B screenshot
```

even if they demonstrate the same problem.

Historical evidence should remain tied to its Run ID.

---

# 29. Run History Immutability

Old Run YAML files remain immutable.

Evidence references in those Runs must remain stable where possible.

If evidence retention policies later remove old artifacts, do not rewrite historical facts to claim evidence never existed.

---

# 30. Application Failure Example

Execution:

```text
STEP-05
Submit user
```

Observed:

```text
Create button resolved
click completed
POST /api/users sent
response = 500
```

Evidence:

```text
TC-CU-01-create-user-500.png
trace.zip
network status metadata
```

Run:

```yaml
classification: application_failure

automation:

  repair_required: false
```

Map:

```text
VERIFIED
```

unless an independent automation problem was also discovered.

---

# 31. Automation Locator Failure Example

Observed:

```text
Primary = 0 matches
Fallback = valid target
```

Run:

```text
passed_with_recovery
```

Map:

```text
DEGRADED
```

Evidence:

```text
No screenshot required by default
```

because structured recovery information may be sufficient.

If investigation is requested:

```text
ANALYZE FAILURE
```

may reproduce with deeper evidence.

---

# 32. Complete Locator Failure Example

Observed:

```text
Primary fails
Fallback fails
Last Resort fails
```

Diagnosis:

```text
locator_failure
```

Evidence:

```text
screenshot
Trace
locator attempts
current URL
target contract
```

Map:

```text
BROKEN
```

until repaired/revalidated.

---

# 33. Evidence Is Not Repair Permission

A screenshot showing failure does not mean:

```text
automation is wrong
```

Trace showing an error does not mean:

```text
locator should change
```

Evidence supports diagnosis.

Classification decides whether repair is allowed.

---

# 34. Screenshot Interpretation

Do not infer expected business behavior solely from screenshot appearance.

Use:

```text
Map
requirements
TCs
business definition
```

to determine expected behavior.

Screenshot represents observed behavior only.

---

# 35. Trace Interpretation

Trace should be used to answer questions such as:

```text
Did the click actually execute?
Did navigation happen?
Was request sent?
What target did locator resolve?
What UI existed before failure?
Was there an overlay?
Did the application change state?
```

Do not modify code merely because Trace reveals a different current UI.

First determine whether current UI change is:

```text
intentional requirement change
application regression
automation drift
```

---

# 36. Evidence Noise Reduction

Do not retain unnecessary:

```text
screenshots of passing steps
duplicate screenshots
full console logs
full network logs
repeated identical artifacts
```

unless explicitly requested.

Evidence quality matters more than evidence quantity.

---

# 37. Evidence and Human Readability

Evidence naming should allow a human to understand:

```text
which Flow
which Run
which TC
what failed
```

without opening every file.

Prefer:

```text
TC-CHECKOUT-04-payment-error.png
```

over:

```text
screenshot123.png
```

---

# 38. Evidence and Agent Readability

The Agent should normally locate evidence through Run YAML references.

Avoid requiring:

```text
scan whole evidence tree
```

for every analysis.

Structured relationships should be explicit.

---

# 39. Evidence Capture Failure

If screenshot or Trace capture itself fails, record that fact.

Do not replace the original test failure with only:

```text
screenshot capture failed
```

The original failure remains primary.

Example:

```yaml
evidence:

  captured: false

  capture_error:
    screenshot: page_closed
```

---

# 40. Evidence Storage Failure

If evidence cannot be written because of:

```text
filesystem permissions
missing directory
disk/storage failure
```

record it as runtime/infrastructure information.

Do not change the business result solely because evidence persistence failed.

---

# 41. Evidence Retention Responsibility

`agentic-flow-builder` determines when evidence is useful.

Project-level retention duration may remain controlled by:

```text
CI
workspace policies
artifact retention settings
repository practices
```

The skill does not need to implement permanent artifact retention in V1.

---

# 42. Final Evidence Principle

Evidence should make failure diagnosis easier, not create a second debugging problem.

Prefer:

```text
structured facts
+
one useful failure screenshot
+
retained Trace when required
```

over:

```text
hundreds of screenshots
+
unstructured logs
+
ambiguous file names
```

The evidence system exists to preserve trustworthy proof of what happened while keeping diagnosis efficient.