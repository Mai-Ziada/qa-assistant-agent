import { resolve, join } from 'node:path';
import { test } from '@playwright/test';
import type { FlowRuntime } from '../../runtime';

import { createFlowRunController } from '../../runtime';
import { runTemplateFlowTc01 } from './template-flow.flow';

const FLOW_ID = 'template-flow';
const FLOW_DIR = resolve(
  process.cwd(),
  'agentic-flow-builder',
  'flows',
  FLOW_ID,
);

const controller = createFlowRunController({
  mapPath: join(FLOW_DIR, `${FLOW_ID}.map.yaml`),
  flowDir: FLOW_DIR,

  // If the generated Map/TCs use project data refs, inject a project
  // RuntimeDataResolver here (for example CallbackDataResolver).
  // dataResolver: projectDataResolver,

  // If auth.mode is inline or flow_scoped_shared, inject a compatible
  // RuntimeAuthManager here. Do not leave required auth wiring unresolved.
  // authManager: projectAuthManager,
});

/**
 * Keep TCs inside the same Flow in Playwright's default mode.
 * This avoids hidden serial dependencies while preventing project-level
 * fullyParallel settings from making same-Flow execution race against the
 * Flow Run aggregation/state lifecycle.
 */
test.describe.configure({ mode: 'default' });

const selectedTestCases = new Set(
  (process.env.AFB_SELECTED_TCS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

function isSelected(testCaseId: string): boolean {
  return selectedTestCases.size === 0 || selectedTestCases.has(testCaseId);
}

/**
 * Unselected TCs are not declared at all, so Playwright never creates a page
 * (or any other fixture) for them. The runtime still knows the selection
 * from AFB_SELECTED_TCS and finalizes the Run on the selected TCs only.
 */
function flowTest(
  testCaseId: string,
  title: string,
  body: (runtime: FlowRuntime) => Promise<void>,
): void {
  if (!isSelected(testCaseId)) return;
  test(title, async ({ page }, testInfo) => {
    const runtime = await controller.runtimeFor(page, testInfo, testCaseId);
    await body(runtime);
  });
}

test.describe('Template Flow', () => {
  test.beforeAll(async ({ browser }) => {
    await controller.beforeAll(browser);
  });

  test.afterEach(async ({ page }, testInfo) => {
    await controller.afterEach(page, testInfo);
  });

  test.afterAll(async () => {
    await controller.finalizeIfComplete();
  });

  flowTest('TC-TEMPLATE-01', 'TC-TEMPLATE-01 - Execute primary business action successfully', runTemplateFlowTc01);
});
