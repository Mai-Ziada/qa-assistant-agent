# Interaction Policy

## Purpose

This policy defines how `agentic-flow-builder` chooses, executes, validates, records, and repairs Playwright interactions.

Locator resolution answers:

```text
Which element?
```

Interaction policy answers:

```text
What is the correct way to interact with it?
```

These are separate responsibilities.

---

# 1. Core Interaction Principle

Always use the Playwright method that most closely represents the intended user interaction and control type.

Prefer Playwright locator actions over:

- direct DOM manipulation
- arbitrary JavaScript evaluation
- synthetic workarounds
- forced actions
- fixed waits

Generated automation should behave like an intentional user journey while remaining deterministic and maintainable.

---

# 2. Preferred Interaction Matrix

Default interaction mapping:

```text
Standard button/link
→ click()

Text input
→ fill()

Textarea
→ fill()

Checkbox
→ check()

Uncheck checkbox
→ uncheck()

Radio button
→ check()

Native select
→ selectOption()

File input
→ setInputFiles()

Keyboard shortcut
→ press()

Character-by-character keyboard interaction
→ pressSequentially()

Hover-dependent UI
→ hover()

Drag-and-drop
→ dragTo()

Clear text
→ clear()
```

These defaults may be overridden only when the target application's behavior requires another interaction.

---

# 3. Text Input Policy

For normal text fields, prefer:

```ts
locator.fill(value);
```

Example:

```ts
await runtime.interact(
  'email_input',
  data.email
);
```

with Map knowledge:

```yaml
interaction:

  preferred:

    method: fill

    data_ref: valid_user.email
```

---

# 4. pressSequentially Policy

Do not use `pressSequentially()` merely to simulate a human typing slowly.

Use it only when the application requires actual sequential keyboard events.

Typical valid cases:

```text
search autocomplete triggered per key
masked input with keyboard-dependent behavior
custom input listening for keydown/keyup
typeahead component requiring sequential events
special keyboard-driven widget
```

Example Map:

```yaml
interaction:

  preferred:

    method: fill


  alternatives:

    - method: pressSequentially

      allowed_when:

        - keyboard_events_are_required
        - masked_input_requires_typing

      automatic_fallback: false
```

---

# 5. Interaction Alternatives Are Not Fallback Locators

Never treat:

```text
fill()
pressSequentially()
```

like:

```text
Primary locator
Fallback locator
```

They are fundamentally different.

Locator alternatives answer:

```text
How do I find the same target?
```

Interaction alternatives answer:

```text
How should this target behave when operated?
```

Changing the interaction method may alter:

- browser events
- validation timing
- application behavior
- autocomplete behavior
- form state
- JavaScript listeners

Therefore interaction methods must never automatically cascade.

---

# 6. No Automatic Interaction Healing

Do NOT implement:

```text
fill fails
→ automatically pressSequentially
```

or:

```text
click fails
→ automatically press Enter
```

or:

```text
selectOption fails
→ manipulate DOM value directly
```

Instead:

```text
Interaction failure
→ structured failure signal
→ diagnosis
→ determine root cause
```

Only after diagnosis may the Map's preferred interaction be changed.

---

# 7. click Policy

Use:

```ts
locator.click();
```

for normal click interactions.

Examples:

```text
button
link
menu item
action icon
tab
card intended as clickable control
```

Do not bypass Playwright actionability checks by default.

If a click fails because the target:

```text
is disabled
is obscured
does not receive events
is unstable
```

do not automatically switch locator or use `force`.

Diagnose the application state.

---

# 8. force Interaction Policy

Do not generate:

```ts
locator.click({ force: true });
```

by default.

Forced actions may hide real problems such as:

```text
overlay incorrectly blocking button
button disabled when it should be enabled
layout obstruction
loading state not completed
unexpected modal
```

Force may be used only when:

- application behavior intentionally requires it
- normal actionability behavior is known to be inappropriate
- the reason is documented
- the interaction remains a valid representation of the intended scenario

Using force to make a failing test pass is prohibited.

---

# 9. Checkbox Policy

For checkbox controls use:

```ts
locator.check();
```

and:

```ts
locator.uncheck();
```

rather than manually clicking whenever the intended state is known.

Example:

Expected:

```text
checkbox must become checked
```

Use:

```ts
await checkbox.check();
```

This communicates intent more clearly than a generic click.

---

# 10. Radio Button Policy

Use:

```ts
locator.check();
```

for radio buttons.

Do not implement manual JavaScript state mutation.

---

# 11. Select Policy

For native `<select>` controls use:

```ts
locator.selectOption();
```

For custom dropdown components, use their actual user interaction behavior, such as:

```text
click trigger
→ resolve option
→ click option
```

Do not assume a visually similar dropdown is a native `<select>`.

MCP exploration should identify the actual control model.

---

# 12. File Upload Policy

For file inputs use:

```ts
locator.setInputFiles();
```

Do not manually type file system paths into a visible field unless the application itself requires that interaction.

Project data should provide or resolve the file path/reference.

---

# 13. Keyboard Policy

Use:

```ts
locator.press();
```

when the scenario specifically requires a keyboard command.

Examples:

```text
Enter
Escape
ArrowDown
Control+A
Tab
```

Keyboard interaction should have a business or UI reason.

Do not replace a stable button click with Enter merely because click failed.

---

# 14. Hover Policy

Use:

```ts
locator.hover();
```

when UI behavior genuinely depends on hover.

Examples:

```text
hover menu
tooltip
hover-only actions
desktop navigation
```

Do not hover unnecessarily before every click.

---

# 15. Drag-and-Drop Policy

Use the appropriate Playwright drag interaction when drag behavior is part of the product.

Do not emulate drag behavior through arbitrary DOM manipulation unless the UI cannot be exercised correctly through supported interaction APIs and the reason is explicitly documented.

---

# 16. Interaction Preconditions

Before an interaction, rely on Playwright actionability and explicit application state.

Do not add arbitrary sleep.

Example:

Bad:

```ts
await page.waitForTimeout(3000);
await saveButton.click();
```

Preferred:

```text
wait for relevant application state
→ interact
```

or rely on Playwright auto-waiting when sufficient.

---

# 17. Auto-Waiting

Playwright interactions should normally use locator APIs so Playwright can perform relevant actionability checks.

Do not duplicate Playwright's waiting behavior with:

```text
sleep
polling loops
repeated manual click attempts
```

unless there is a specific state that Playwright cannot infer automatically.

---

# 18. Explicit State Waiting

When an action depends on application state beyond locator actionability, wait for the meaningful condition.

Examples:

```text
URL changed
dialog became visible
loading indicator disappeared
API response completed
button became enabled
specific content appeared
```

Wait for the condition itself.

Do not convert it into an arbitrary duration.

---

# 19. Navigation-Producing Actions

When an interaction causes navigation, define the expected navigation state.

Example:

```text
Click Users
→ expected URL /users
```

Validation may use:

```text
URL assertion
expected page target
expected heading
expected module state
```

Do not consider click success alone sufficient if navigation is part of the business expectation.

---

# 20. Network-Producing Actions

When a business-critical interaction triggers a meaningful API operation, runtime diagnostics may observe the relevant request/response.

Example:

```text
Submit Create User
→ POST /api/users
```

Network observation should support diagnosis.

It should not replace UI/business assertions unless the test case specifically validates API behavior.

---

# 21. Interaction Success vs Business Success

A successful interaction means:

```text
the intended target was resolved
and the intended interaction was executed
```

It does NOT automatically mean:

```text
business scenario passed
```

Example:

```text
Submit button clicked successfully
POST request sent
API returned 500
```

Interaction:

```text
successful
```

Business result:

```text
failed
```

Automation repair:

```text
not justified
```

---

# 22. Interaction Failure Classification

Potential interaction-related signals include:

```text
target resolved but action could not execute
element not editable
element unexpectedly disabled
element does not receive events
interaction method incompatible with target
keyboard-dependent control not responding to fill()
custom control requires different interaction
```

Do not immediately classify all such cases as automation defects.

Diagnosis must determine whether the problem belongs to:

```text
automation
application
data
precondition
environment
```

---

# 23. Expected State After Interaction

Important actions should define their expected state in the Flow Map.

Example:

```yaml
interaction:

  preferred:
    method: click


expected_state:

  after_action:

    assertions:
      - ASSERT-CREATE-USER-DIALOG
```

This creates a clear relationship:

```text
Action
→ Expected State
```

instead of:

```text
Action
→ Continue blindly
```

---

# 24. Assertions After Interaction

Use web-first assertions where applicable.

Examples:

```text
dialog visible
status changed
record displayed
button disabled
toast visible
URL updated
form closed
```

Assertions should verify the intended target/state, not merely any matching text on the page.

---

# 25. Interaction Map Model

Example:

```yaml
email_input:

  target_contract:

    role: textbox

    accessible_name: Email

    unique: true


  interaction:

    preferred:

      method: fill

      data_ref: valid_user.email


    alternatives:

      - method: pressSequentially

        data_ref: valid_user.email

        allowed_when:

          - keyboard_events_are_required

        automatic_fallback: false
```

---

# 26. Changing Preferred Interaction

If diagnosis proves:

```text
fill()
```

is not appropriate and:

```text
pressSequentially()
```

is required, update the Map intentionally.

Example:

Before:

```yaml
preferred:
  method: fill
```

After:

```yaml
preferred:
  method: pressSequentially
```

Then:

```text
Map revision++
Map status → REVALIDATION_REQUIRED
```

A change to interaction semantics invalidates previous verification for the changed revision.

---

# 27. Interaction Repair

Before changing interaction code:

```text
Read failed Run
→ confirm target resolved correctly
→ inspect interaction failure
→ inspect screenshot/trace if needed
→ re-explore via MCP only when needed
→ identify minimum change
```

Do not modify locators when the target was already resolved correctly.

Do not modify business assertions merely to accommodate the current incorrect behavior.

---

# 28. DOM Manipulation Policy

Avoid direct browser-side mutation such as:

```ts
page.evaluate(...)
```

to set:

```text
input values
checkbox state
selected options
button state
application data
```

when a normal user-facing interaction exists.

Direct DOM manipulation may bypass:

```text
application event listeners
validation
framework state
real user behavior
```

Use it only for explicit technical scenarios where user interaction is not the subject under test.

---

# 29. Duplicate Action Prevention

Do not retry business actions blindly.

Example:

```text
click Submit
timeout
click Submit again
```

may create duplicate records or requests.

Before repeating a state-changing action, diagnose whether the first action was actually submitted.

Use runtime/network/application state evidence where appropriate.

---

# 30. State-Changing Actions

Treat actions such as these carefully:

```text
Create
Delete
Submit
Approve
Reject
Pay
Cancel
Transfer
Publish
```

If execution outcome becomes ambiguous:

```text
do not blindly retry
```

First determine whether the operation reached the application/backend.

This prevents duplicate or destructive side effects.

---

# 31. Verification Modes and Interactions

Locator verification modes:

```text
primary_only
fallback_only
last_resort_only
```

change only locator selection.

They do NOT automatically change interaction methods.

Example:

All three verification runs for an email input should still use:

```text
fill()
```

if `fill()` is the Map's preferred interaction.

The objective is:

```text
Verify locator strategies independently
```

not:

```text
change locator and interaction simultaneously
```

This isolates what each verification run is proving.

---

# 32. MCP Interaction Discovery

During BUILD or investigation, MCP may help determine:

```text
actual control type
whether a dropdown is native/custom
whether keyboard events matter
whether action causes navigation
whether action causes network request
whether modal/dialog appears
whether field uses masking/autocomplete
```

MCP behavior during exploration must be translated into stable Playwright interaction knowledge.

Do not generate MCP-ref-based interactions.

---

# 33. Interaction Evidence

When interaction failure occurs, structured Run data should capture relevant information such as:

```text
element
step
resolved locator strategy
interaction method
whether target resolved
whether target was enabled/editable
whether action completed
relevant error
relevant URL
```

Screenshot and Trace are retained according to Evidence Policy.

---

# 34. Final Interaction Rule

Never ask:

```text
What alternative action can make this test pass?
```

Ask:

```text
What interaction accurately represents
the intended user behavior for this target?
```

Automation correctness has priority over producing a green result.