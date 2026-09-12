# agentic-flow-builder runtime

This directory is the canonical runtime package copied into a project workspace on first use of `agentic-flow-builder`.

## Required project dependencies

The workspace project must provide:

- Node.js >= 20
- `@playwright/test` >= 1.38.0
- `yaml` >= 2.0.0

Required type-check tooling:

- TypeScript >= 5
- `@types/node` >= 20

`runtime-manifest.json` declares the canonical requirements, and `compatibility-check.ts` is the executable readiness gate that validates them before generating/running a Flow. It must not leave the workspace with unresolved runtime imports.

## Runtime ownership

The workspace copy is project infrastructure. After first initialization it must not be silently overwritten from the Skill's canonical runtime.

Flow-specific workarounds belong in the Flow Map or `<flow>.flow.ts`, not in shared runtime.

## Playwright execution model

Generated Flow specs should explicitly opt out of project-wide `fullyParallel` execution for the single Flow file:

```ts
import { test } from '@playwright/test';
import { createFlowRunController } from '../../runtime';

test.describe.configure({ mode: 'default' });
```

This keeps TCs in the Flow file ordered in the normal Playwright mode while retaining independent test retries and isolated Playwright test contexts.

A generated spec wires the controller once:

```ts
const controller = createFlowRunController({
  mapPath: './create-user.map.yaml',
  flowDir: __dirname,
});

test.beforeAll(async ({ browser }) => {
  await controller.beforeAll(browser);
});

test.afterEach(async ({ page }, testInfo) => {
  await controller.afterEach(page, testInfo);
});

test.afterAll(async () => {
  await controller.finalizeIfComplete();
});
```

Each TC remains a real Playwright `test()` and gets its runtime through:

```ts
const runtime = await controller.runtimeFor(page, testInfo, 'TC-CU-01');
```

## Execution environment contract

Skill-managed executions pass run context through environment variables consumed by `FlowRunController`:

```text
AFB_RUN_ID
AFB_RUN_TYPE
AFB_EXECUTION_MODE
AFB_SELECTED_TCS
```

Use a new filesystem-safe `AFB_RUN_ID` for every logical Flow Run. Official verification uses separate IDs for Primary, Fallback, and Last Resort. `AFB_SELECTED_TCS` is optional and is intended for selected normal Runs or targeted repair validation, not partial official verification.

For V1, one logical Flow Run targets one Playwright project/browser. Execute browser/project matrices as separate sequential Flow Runs.

## Evidence

Failure screenshots are written under the project's evidence root.

Trace retention should be enabled in the project's Playwright configuration when trace evidence is desired, for example `retain-on-failure`. The Evidence Manager copies the trace attachment when Playwright exposes one for the failed test.

## Validation

The canonical runtime should be type-checked before it is promoted into the Skill package:

```bash
npx tsc -p <project-tsconfig> --noEmit
```

The Skill should also run `assertRuntimeCompatibility(projectRoot)` or an equivalent preflight before execution.
