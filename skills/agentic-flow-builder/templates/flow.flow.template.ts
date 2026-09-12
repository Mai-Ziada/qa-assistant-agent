import type { FlowRuntime } from '../../runtime';

/**
 * Replace this interface with only the data actually consumed by this Flow.
 * Prefer project data references/resolvers over duplicated hardcoded fixtures.
 */
export interface TemplateFlowData {
  // Example:
  // email: string;
}

/**
 * One exported business function per TC (or per genuinely reusable business
 * operation) keeps the Flow implementation explicit and readable.
 *
 * Rules:
 * - Do not hardcode Playwright locators here.
 * - Use Map element IDs through runtime.interact().
 * - Use Map assertion IDs through runtime.assert().
 * - Do not write Run YAML here.
 * - Do not capture screenshots here.
 * - Do not classify or repair failures here.
 */
export async function runTemplateFlowTc01(
  runtime: FlowRuntime,
  _data?: TemplateFlowData,
): Promise<void> {
  // When the TC declares data.ref in the Map, generated Flow code may use:
  // const data = await runtime.resolveCurrentTestCaseData<TemplateFlowData>();
  // For explicit/multiple refs, use runtime.resolveData(ref).
  await runtime.step('STEP-01', async () => {
    await runtime.goto();
  });

  await runtime.step('STEP-02', async () => {
    await runtime.interact('example_action_button');
    await runtime.assert('ASSERT-EXAMPLE-ACTION-DISABLED');
  });
}
