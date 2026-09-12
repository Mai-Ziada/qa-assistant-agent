# SHOW FLOW

## Purpose

`SHOW FLOW` is a read-only detailed inspection command for one existing Flow.

It MUST NOT execute Playwright tests, invoke MCP by default, mutate the Map, update runtime state, or require the full Runtime Readiness Gate.

## Workflow

1. Resolve the requested Flow folder.
2. Read `<flow>.map.yaml`.
3. Inspect current verification references and locator validation statuses.
4. Read the latest finalized Run when available.
5. Summarize current automation knowledge and health.

## Output

Show at minimum:

```text
Flow name / ID
Description
Revision
Map Status
Verified Revision
TC count
Step count
Element count
Primary/Fallback/Last Resort validation summary
Brittle locator count
Last Run ID
Last Run Type
Last Run Result
Known current automation issues
Revalidation reason when applicable
```

Keep these distinct:

```text
Current Map Status
Last Run Result
Last Run Agent Health
```

A failed product Run must not be presented as a broken automation Map unless the recorded diagnosis supports that conclusion.

## Read-Only Rule

If inspection reveals a problem, recommend the correct next command:

```text
ANALYZE FAILURE
REPAIR FLOW
UPDATE FLOW
VERIFY FLOW
```

Do not perform the mutation silently.
