# LIST FLOWS

## Purpose

`LIST FLOWS` is a read-only inventory command for generated `agentic-flow-builder` Flows in the current workspace.

It MUST NOT execute Playwright tests, invoke MCP, mutate Maps, change runtime files, or require the full Runtime Readiness Gate.

## Workflow

1. Locate the workspace root.
2. Locate `agentic-flow-builder/flows/`.
3. Discover Flow folders containing a Flow Map.
4. Read current Map metadata.
5. Read the latest finalized Run YAML when available.
6. Present current knowledge without mutating anything.

## Output

Show at minimum:

```text
Flow
Revision
Map Status
Last Run ID
Last Run Type
Last Run Result
```

Keep **Map Status** and **Last Run Result** visibly separate.

Example:

```text
create-user | revision 3 | VERIFIED | last run: partial_failed
```

This is valid because a product failure may coexist with healthy automation.

## Missing/Corrupt Data

If a Map or latest Run cannot be read, report that Flow as unreadable/incomplete rather than guessing.

Do not repair it automatically.
