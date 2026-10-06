# Visual Evidence and Annotation Policy

Read this file only when screenshots are supplied, can be captured, or are needed to demonstrate the issue.

## Evidence Set

For every screenshot, keep only the annotated and sanitized copy. The unredacted source is never
saved under the draft folder — annotation and redaction happen before anything is written to
`evidence/`, so nothing sensitive sits there waiting to be uploaded by mistake.

Store it under:

```text
.qa/bugs/<draft-id>/evidence/
└── annotated/
```

## Evidence Count

Use one screenshot when it shows the page, affected component, incorrect result, and sufficient context. Use multiple screenshots only when each proves a distinct point, such as before/after, source/result, Admin/application, design/implementation, platforms, roles, or UI/Network evidence.

Do not upload redundant images. For comparisons, save the single combined annotated image only.

## Annotation Types

- Rectangle around the affected region.
- Arrow pointing at a precise target.
- Highlight for a specific value or message.
- Numbered callout for multiple related areas.
- Short label describing the observed problem.
- Comparison marker linking related areas.
- Blur or opaque redaction for sensitive content.

## Annotation Rules

1. Point precisely at the evidence and do not cover it.
2. Use clear high-contrast styling; red is preferred for the problem location.
3. Keep labels short and factual.
4. Use numbered callouts when several areas need explanation.
5. Preserve page and state context; do not crop essential information.
6. Redact credentials, tokens, personal data, payment data, and unrelated confidential content.
7. Never alter values or create visual evidence that was not present.
8. Do not label an unproven cause; write `Incorrect value` rather than `Backend failure` unless the screenshot itself proves it.
9. Review the final image at readable size before approval.

## File Naming

Use:

```text
<draft-id>_<sequence>_<page>_<short-description>_annotated.png
```

Examples:

```text
BUG-DRAFT-014_01_checkout_schedule-error_annotated.png
BUG-DRAFT-014_02_network_failed-response_annotated.png
```

## Evidence Metadata

For every proposed attachment, record:

- Evidence ID.
- Purpose.
- Annotated path.
- Caption explaining what it proves.
- Annotation summary.
- Whether sensitive data was found and redacted.
- Whether it passed the quality gate.
- Whether the user approved it for upload.

## Quality Gate

An image is ready only when:

- The issue is visible and the target is correct.
- Annotation does not cover the proof.
- Text is readable and context is sufficient.
- Sensitive information is removed.
- The image adds non-duplicate evidence.
- The filename is valid.
- It maps to a specific Actual Result.

If annotation tools are unavailable, mark visual preparation as blocked and ask the user whether to continue without annotation. Never save an unannotated copy as a stand-in, and never claim an annotated file exists when it does not.

## Upload Rules

- Preview annotated evidence before requesting publication approval.
- Upload only the exact files approved by the user.
- If the ticket succeeds but an attachment fails, keep the ticket, mark the result `partially-successful`, and retry only the failed attachment when safe.
- Never create a second ticket because an attachment failed.

