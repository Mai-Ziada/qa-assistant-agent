# Bug Template

Read this file whenever creating or editing a bug draft.

## Title

Use:

```text
<Feature or Page> — <Specific incorrect behavior>
```

The title must identify the affected feature and the observed failure. Keep it concise and searchable. Avoid vague phrases such as `not working`, do not include Severity or environment unless project convention requires it, and do not claim an unproven cause.

Example:

```text
Scheduled Orders — Internal Server Error Appears When Confirming the Selected Time
```

## Mandatory Description

Use these sections in this order without adding other sections unless project configuration or the user explicitly requires them:

```markdown
### 🟨 GIVEN

- <Relevant precondition>
- <Relevant configuration, role, data, or record state>

### 🟦 WHEN

1. <First reproduction action>
2. <Second reproduction action>
3. <Action that triggers the issue>

### 🟩 Expected(related to business)

<Correct, observable behavior supported by a confirmed business source.>

### 🟥 Actual

<Directly observed incorrect behavior.>

### 📎 Attachments

- `<approved-annotated-file>` — <What the evidence proves>
```

## GIVEN Rules

- Include only relevant conditions existing before reproduction: role, authentication state, configuration, record state, test data, feature flag, platform, or language.
- Do not put actions in GIVEN.
- Do not include setup that has no effect on reproduction or interpretation.
- Remove unused placeholder bullets.

## WHEN Rules

- Use sequential numbered actions and exact control names when known.
- Include values only when they affect the result.
- Include every necessary intermediate action but remove unrelated navigation.
- Do not put Expected or Actual Results inside the steps.
- Do not claim actions that were not performed.

## Expected Rules

- State an observable and testable business outcome.
- Derive it from approved requirements, acceptance criteria, confirmed business rules, approved design, or an authorized stakeholder statement.
- Do not write `The system should work correctly`.
- If the business result is uncertain, stop with `needs-business-clarification`; do not publish a confirmed bug.

## Actual Rules

- Describe only directly observed behavior: error, incorrect value or status, missing action, redirect, failed response, incorrect saved data, or partial completion.
- Include exact visible messages or values when useful.
- Do not state an unconfirmed technical cause.

## Attachments Rules

- List only files that exist, passed the evidence quality gate, and are approved for upload.
- Use exact filenames and explain what each file proves.
- Do not write generic entries such as `Screenshot` or `Video`.
- If no evidence is available, use:

```markdown
### 📎 Attachments

No attachment is currently available.
```

Warn before publishing a visible UI defect without visual evidence.

## Pre-Publish Lint

- No empty bullets, numbered steps, headings, or placeholders.
- Expected and Actual are distinct and meaningful.
- WHEN steps are sufficient to reproduce the issue.
- Each listed attachment exists and is approved.
- The title is not repeated in the description.
- No extra metadata sections were added.

## Example

```markdown
### 🟨 GIVEN

- The user is logged in as a Customer.
- Scheduled ordering is enabled for the selected branch.
- The cart contains at least one available item.

### 🟦 WHEN

1. Proceed to Checkout.
2. Select `Scheduled Delivery`.
3. Choose an available date and time.
4. Select `Confirm`.

### 🟩 Expected(related to business)

The selected scheduled-delivery time should be accepted, and the user should be able to continue and place the order.

### 🟥 Actual

An `Internal Server Error` message appears, and the user cannot complete the scheduled order.

### 📎 Attachments

- `BUG-DRAFT-014_01_schedule-error_annotated.png` — Shows the error displayed immediately after selecting Confirm.
```

