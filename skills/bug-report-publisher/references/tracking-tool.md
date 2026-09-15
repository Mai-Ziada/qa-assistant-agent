# Tracking Tool Operations

Read this file before searching or mutating a tracking tool. Use the configured connector or API and its current schema; do not invent projects, field IDs, users, or issue types.

## Resolve the Destination

Before publication, establish:

- Tracking tool.
- Project.
- Issue type.
- Required fields.
- Field mapping.
- Attachment limits.
- Whether the user is authorized to create or update the issue.

If the target is ambiguous, stop and ask.

## Duplicate Search

Before creating, search using combinations of title terms, feature/page, action, visible error, endpoint, platform, build, test-case ID, business-rule wording, and project labels.

Classify candidates as:

- **Exact duplicate:** same failure, context, and affected behavior.
- **Probable duplicate:** strongly similar but requires review.
- **Related issue:** same area but a distinct failure.
- **No duplicate found:** no sufficiently similar issue.

Present ticket, status, similarity reasoning, and a suggested action. Do not create a new issue over an exact or probable duplicate without an explicit user decision. Do not comment on, link, assign, close, reopen, or transition an existing issue without approval.

## Field Mapping

Prefer dedicated fields:

| Internal value | Tracking field |
|---|---|
| Title | Summary or Title |
| Mandatory template | Description or Repro Steps |
| Severity | Severity |
| Priority | Priority |
| Environment | Environment or System Info |
| Build | Affected Version |
| Platform | Platform, Tag, or Label |
| Requirement/Test/Flow ID | Work-item link or custom field |
| Evidence | Attachments |

Use project-approved mappings. If a dedicated field is unavailable, use an approved label, tag, custom field, or documented fallback and disclose where the value was stored. Do not expand the mandatory description merely for convenience.

## Approval Preview

Immediately before mutation, show:

- Proposed operation: create, update, comment, link, or upload.
- Tool, project, issue type, and target issue when applicable.
- Exact final title and description.
- Severity, Priority, and environment fields.
- Duplicate-search result.
- Exact attachment names with annotated previews.
- Missing fields, assumptions, and warnings.

Require explicit approval. Approval covers only the displayed action and attachments.

## Publication

1. Validate required fields and the approved draft.
2. When practical, run a final narrow duplicate search for recently created issues.
3. Perform the approved issue mutation once.
4. Save the returned issue ID/key immediately.
5. Upload only approved attachments.
6. Verify the saved title, description, fields, and every attachment independently.

## Idempotency and Retry

Use a stable draft ID or fingerprint as an idempotency marker when the tool supports it. If creation times out or returns an uncertain result, search for the exact draft before retrying. Never retry a successful create, update, comment, link, or attachment upload.

Retry only a failed safely repeatable operation, at most once unless the tool explicitly provides a safe retry instruction.

## Partial Success

If the ticket succeeds but an attachment fails:

- Keep the existing ticket.
- Do not create another.
- Mark the result `partially-successful`.
- Report successful, failed, and excluded attachments separately.
- Offer the safest recovery action.

## Result Format

Return:

```text
Publishing Status: Successful | Partially Successful | Failed | Saved as Draft | Cancelled

Ticket:
- Key/ID:
- URL:
- Project:
- Issue Type:
- Current Status:

Severity and Priority:
- Severity:
- Priority:

Attachments:
- <filename>: Uploaded | Failed | Excluded

Duplicate Check:
- Result:
- Related Tickets:

Warnings:
- <warning or None>

Next Required Action:
- <action or None>
```

Never claim full success unless the ticket fields and all approved attachments were verified.

