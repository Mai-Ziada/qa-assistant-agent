# Locator Policy

## Purpose

This policy defines how `agentic-flow-builder` discovers, stores, verifies, resolves, degrades, and repairs Playwright locators.

The objective is durable target resolution, not merely finding an element that works today.

---

# 1. Three-Locator Contract

Every interactive or assertion-critical mapped element MUST define, where technically practical:

```text
Primary
Fallback
Last Resort
```

All three strategies MUST represent the same semantic target.

A target must never change meaning merely because a fallback was required.

---

# 2. Default Locator Preference

Use this preference heuristic:

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

This is not a blind ranking.

If a stable project test ID exists, prefer `getByTestId()` as Primary.

Do not use an unstable test ID merely because test IDs rank first.

---

# 3. Target Contract

Important elements MUST define semantic expectations such as:

```yaml
target_contract:
  role: button
  accessible_name: Add User
  unique: true
```

Optional contract fields may include:

```text
role
accessible_name
label
tag
input_type
expected_text
container
unique
editable
```

Locator resolution is successful only when the candidate resolves and satisfies the target contract strongly enough to identify the intended element.

---

# 4. Locator Independence

Primary, Fallback, and Last Resort SHOULD use independent mechanisms where practical.

Preferred example:

```text
Primary      → test_id
Fallback     → role + accessible name
Last Resort  → stable scoped CSS
```

Avoid three selectors that all depend on the same brittle DOM structure.

---

# 5. Normal Resolution Order

Normal execution resolves:

```text
Primary
  ↓ resolution failure only
Fallback
  ↓ resolution failure only
Last Resort
```

Fallback is allowed only when target resolution fails.

Examples of target-resolution failure:

```text
no matching element
ambiguous target
target contract mismatch
invalid locator definition
```

---

# 6. Do Not Fallback After Successful Resolution

Once the intended target resolves successfully, do NOT switch locator strategy because:

```text
element is disabled
click fails
overlay blocks interaction
form validation prevents submission
application returns 4xx/5xx
assertion value is wrong
business state is wrong
navigation fails after interaction
```

Those are interaction/application/assertion/navigation problems, not locator-resolution problems.

---

# 7. Verification Modes

Official Flow verification uses independent executions:

```text
primary_only
fallback_only
last_resort_only
```

A forced verification mode MUST use only its selected locator tier.

No other locator tier may rescue a failed verification strategy.

Official verification/revalidation MUST cover all Flow TCs.

A targeted `repair_validation` may cover a subset, but MUST NOT count as one of the official three verification proofs.

---

# 8. Locator Validation Status

Each stored locator has an independent status:

```text
pending
validated
failed
```

This status is separate from the Flow Map status.

A Flow can be `REVALIDATION_REQUIRED` while some unchanged locator definitions remain known, but official current-revision verification evidence controls whether the Flow may return to `VERIFIED`.

---

# 9. Recovery Health

During a normal Run:

```text
Primary fails + Fallback succeeds
→ recovery recorded
→ Flow health may become DEGRADED
```

```text
Primary + Fallback fail + Last Resort succeeds
→ recovery recorded
→ Flow health may become DEGRADED_CRITICAL
```

Last Resort success means the business scenario continued; it does not mean locator health is good.

---

# 10. Repair Rules

Do not automatically promote Fallback or Last Resort to Primary.

Before changing locator definitions:

```text
Run evidence
→ diagnosis
→ confirm locator ownership
→ minimum safe locator change
→ revision++
→ REVALIDATION_REQUIRED
→ full revalidation
```

Do not repair a locator because the product returned an application/business failure.

---

# 11. MCP Discovery

Playwright MCP may be used to discover and test locator candidates.

MCP snapshot references such as:

```text
ref=e31
```

MUST NOT be persisted as generated automation locators.

Generated code must use durable Playwright locator definitions from the Flow Map.

---

# 12. Brittle Strategies

CSS, XPath, and `nth()` are allowed only when stronger semantic strategies are unavailable or unsuitable.

For `nth()`:

- document why index selection is stable enough
- scope the base locator as tightly as practical
- treat it as brittle by default

Do not use positional selection merely to silence strict-mode ambiguity.

---

# 13. Final Rule

Locator resilience must never become silent self-healing.

The runtime may recover target resolution using an already-defined fallback strategy, but changing locator knowledge requires diagnosis, explicit Map modification, revision change, and revalidation.
