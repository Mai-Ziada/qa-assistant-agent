import {
  access,
  link,
  mkdir,
  open,
  rename,
  rm,
} from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';
import type {
  FailureRecord,
  LocatorAttemptRecord,
  MapStatus,
  RunRecord,
  RunResult,
  TestCaseExecutionRecord,
} from '../types';

const MAP_STATUSES = new Set<MapStatus>([
  'drafted',
  'primary_validated',
  'fallback_validated',
  'verified',
  'degraded',
  'degraded_critical',
  'broken',
  'revalidation_required',
]);

const RUN_RESULTS = new Set<RunResult>([
  'passed',
  'passed_with_recovery',
  'partial_failed',
  'partial_blocked',
  'failed',
  'blocked',
]);

const RUN_TYPES = new Set([
  'verification',
  'normal',
  'revalidation',
  'repair_validation',
]);

const EXECUTION_MODES = new Set([
  'normal',
  'primary_only',
  'fallback_only',
  'last_resort_only',
]);

const TEST_CASE_RESULTS = new Set([
  'passed',
  'failed',
  'blocked',
]);

const LOCATOR_TIERS = new Set(['primary', 'fallback', 'last_resort']);
const LOCATOR_STRATEGIES = new Set([
  'test_id',
  'role',
  'label',
  'scoped',
  'placeholder',
  'text',
  'alt_text',
  'attribute',
  'css',
  'xpath',
  'nth',
]);
const FAILURE_CLASSIFICATIONS = new Set([
  'application_failure',
  'locator_failure',
  'interaction_failure',
  'assertion_failure',
  'data_failure',
  'auth_failure',
  'environment_failure',
  'navigation_failure',
  'automation_code_failure',
  'unknown',
]);

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'cookies',
  'client_secret',
  'api_key',
  'apikey',
]);

/**
 * Finalizes immutable Flow Run YAML records.
 *
 * Responsibilities:
 * - validate the complete RunRecord before persistence
 * - reject inconsistent aggregation/results
 * - reject obvious secret-bearing fields
 * - serialize to YAML
 * - write through a temporary file
 * - create the final run file without silently overwriting history
 *
 * RunSession owns aggregation. RunWriter owns finalization safety.
 */
export class RunWriter {
  constructor(private readonly runsDir: string) {}

  async write(record: RunRecord): Promise<string> {
    this.validate(record);

    await mkdir(this.runsDir, {
      recursive: true,
    });

    const finalPath = join(
      this.runsDir,
      `${record.run.id}.yaml`,
    );

    await this.assertFinalPathAvailable(finalPath);

    const yaml = stringify(record, {
      indent: 2,
    });

    /**
     * Validation happens before any finalized file exists.
     * The temp file lives in the same directory so finalization stays
     * on the same filesystem.
     */
    const tempPath = join(
      this.runsDir,
      `.${record.run.id}.${process.pid}.${Date.now()}.tmp`,
    );

    const handle = await open(tempPath, 'wx');

    try {
      await handle.writeFile(yaml, {
        encoding: 'utf8',
      });

      /**
       * Flush file content before exposing the final path.
       */
      await handle.sync();
    } catch (error) {
      await handle.close().catch(() => undefined);
      await rm(tempPath, { force: true });
      throw error;
    }

    await handle.close();

    try {
      await this.atomicFinalize(tempPath, finalPath);
    } catch (error) {
      await rm(tempPath, { force: true });
      throw error;
    }

    return finalPath;
  }

  /**
   * Structural + semantic final Run validation.
   *
   * This intentionally protects the invariants that matter for an
   * immutable Run history without introducing another validator file.
   */
  validate(record: RunRecord): void {
    if (!record || typeof record !== 'object' || !record.run) {
      this.fail('Run record must contain a top-level "run" object.');
    }

    const run = record.run;

    this.requireNonEmptyString(run.id, 'run.id');
    this.requireFilesystemSafeRunId(run.id);
    this.requireNonEmptyString(run.flow, 'run.flow');

    this.requireValidDate(run.started_at, 'run.started_at');

    if (run.finished_at === null) {
      this.fail('Finalized Run must contain run.finished_at.');
    }

    this.requireValidDate(run.finished_at, 'run.finished_at');

    if (
      run.duration_ms === null ||
      !Number.isFinite(run.duration_ms) ||
      run.duration_ms < 0
    ) {
      this.fail('run.duration_ms must be a non-negative number for finalized Runs.');
    }

    if (!RUN_TYPES.has(run.type)) {
      this.fail(`Unsupported run.type: ${String(run.type)}`);
    }

    if (!EXECUTION_MODES.has(run.execution_mode)) {
      this.fail(
        `Unsupported run.execution_mode: ${String(run.execution_mode)}`,
      );
    }

    if (!Number.isInteger(run.map_revision) || run.map_revision < 1) {
      this.fail('run.map_revision must be an integer >= 1.');
    }

    if (!MAP_STATUSES.has(run.map_status_before)) {
      this.fail(`Invalid run.map_status_before: ${run.map_status_before}`);
    }

    if (!MAP_STATUSES.has(run.map_status_after)) {
      this.fail(`Invalid run.map_status_after: ${run.map_status_after}`);
    }

    if (!RUN_RESULTS.has(run.result)) {
      this.fail(`Invalid run.result: ${run.result}`);
    }

    if (!Array.isArray(run.test_cases) || run.test_cases.length === 0) {
      this.fail('Finalized Run must contain at least one executed test case.');
    }

    this.validateSelection(record);
    this.validateTestCases(run.test_cases);
    this.validateSummary(record);
    this.validateAggregateResult(record);
    this.validateLocatorExecution(record);
    this.validateFailures(record);
    this.validateEvidence(record);
    this.validateTransition(record);
    this.validateAgentSummary(record);
    this.assertNoSensitiveKeys(record);
  }

  private validateSelection(record: RunRecord): void {
    const { selection, test_cases: testCases } = record.run;

    if (
      selection.mode !== 'all_test_cases' &&
      selection.mode !== 'selected_test_cases'
    ) {
      this.fail(`Invalid run.selection.mode: ${selection.mode}`);
    }

    const selected = selection.test_cases;

    if (!Array.isArray(selected) || selected.length === 0) {
      this.fail('run.selection.test_cases must contain at least one TC ID.');
    }

    this.assertUnique(selected, 'run.selection.test_cases');

    const executedIds = testCases.map((tc) => tc.id);
    this.assertUnique(executedIds, 'run.test_cases[].id');

    if (!this.sameStringSet(selected, executedIds)) {
      this.fail(
        'Selected TC IDs must exactly match the finalized executed TC records. Unselected TCs must not be written as blocked.',
      );
    }
  }

  private validateTestCases(
    testCases: TestCaseExecutionRecord[],
  ): void {
    for (const testCase of testCases) {
      this.requireNonEmptyString(
        testCase.id,
        'run.test_cases[].id',
      );

      this.requireNonEmptyString(
        testCase.name,
        `run.test_cases[${testCase.id}].name`,
      );

      if (!TEST_CASE_RESULTS.has(testCase.result)) {
        this.fail(
          `Invalid result for TC ${testCase.id}: ${String(testCase.result)}`,
        );
      }

      if (!Array.isArray(testCase.steps)) {
        this.fail(`TC ${testCase.id} steps must be an array.`);
      }

      if (!Array.isArray(testCase.failure_ids)) {
        this.fail(`TC ${testCase.id} failure_ids must be an array.`);
      }

      this.assertUnique(
        testCase.failure_ids,
        `TC ${testCase.id} failure_ids`,
      );
    }
  }

  private validateSummary(record: RunRecord): void {
    const { summary, test_cases: testCases, failures } = record.run;

    const passed = this.countResult(testCases, 'passed');
    const failed = this.countResult(testCases, 'failed');
    const blocked = this.countResult(testCases, 'blocked');
    const total = testCases.length;

    const totalSteps = testCases.reduce(
      (sum, tc) => sum + tc.steps.length,
      0,
    );

    const completedSteps = testCases.reduce(
      (sum, tc) =>
        sum + tc.steps.filter((step) => step.result === 'passed').length,
      0,
    );

    const automationFailures = failures.filter(
      (failure) => failure.automation.repair_required,
    ).length;

    const applicationFailures = failures.filter(
      (failure) => failure.classification === 'application_failure',
    ).length;

    const otherFailures = failures.filter(
      (failure) =>
        failure.classification !== 'application_failure' &&
        !failure.automation.repair_required,
    ).length;

    this.expectEqual(summary.total_test_cases, total, 'summary.total_test_cases');
    this.expectEqual(summary.passed, passed, 'summary.passed');
    this.expectEqual(summary.failed, failed, 'summary.failed');
    this.expectEqual(summary.blocked, blocked, 'summary.blocked');
    this.expectEqual(
      summary.locator_recoveries,
      record.run.locator_execution.recoveries.length,
      'summary.locator_recoveries',
    );
    this.expectEqual(
      summary.automation_failures,
      automationFailures,
      'summary.automation_failures',
    );
    this.expectEqual(
      summary.application_failures,
      applicationFailures,
      'summary.application_failures',
    );
    this.expectEqual(
      summary.other_failures,
      otherFailures,
      'summary.other_failures',
    );

    if (summary.total_steps !== undefined && summary.total_steps !== null) {
      this.expectEqual(summary.total_steps, totalSteps, 'summary.total_steps');
    }

    if (
      summary.completed_steps !== undefined &&
      summary.completed_steps !== null
    ) {
      this.expectEqual(
        summary.completed_steps,
        completedSteps,
        'summary.completed_steps',
      );
    }

    const expectedPassRate =
      total > 0
        ? Math.round((passed / total) * 10000) / 100
        : null;

    if (summary.pass_rate !== expectedPassRate) {
      this.fail(
        `summary.pass_rate is inconsistent. Expected ${String(expectedPassRate)}, received ${String(summary.pass_rate)}.`,
      );
    }
  }

  private validateAggregateResult(record: RunRecord): void {
    const testCases = record.run.test_cases;
    const passed = this.countResult(testCases, 'passed');
    const failed = this.countResult(testCases, 'failed');
    const blocked = this.countResult(testCases, 'blocked');
    const recoveries = record.run.locator_execution.recoveries.length;

    let expected: RunResult;

    if (failed > 0) {
      expected = passed > 0 ? 'partial_failed' : 'failed';
    } else if (blocked > 0) {
      expected = passed > 0 ? 'partial_blocked' : 'blocked';
    } else if (passed > 0 && recoveries > 0) {
      expected = 'passed_with_recovery';
    } else if (passed > 0) {
      expected = 'passed';
    } else {
      expected = 'blocked';
    }

    if (record.run.result !== expected) {
      this.fail(
        `run.result is inconsistent with TC results/recoveries. Expected "${expected}", received "${record.run.result}".`,
      );
    }
  }

  private validateLocatorExecution(record: RunRecord): void {
    const locatorExecution = record.run.locator_execution;

    if (locatorExecution.strategy_mode !== record.run.execution_mode) {
      this.fail(
        'locator_execution.strategy_mode must match run.execution_mode.',
      );
    }

    const validTcIds = new Set(
      record.run.test_cases.map((tc) => tc.id),
    );

    for (const recovery of locatorExecution.recoveries) {
      if (
        recovery.test_case &&
        !validTcIds.has(recovery.test_case)
      ) {
        this.fail(
          `Locator recovery references unknown TC: ${recovery.test_case}`,
        );
      }

      if (
        recovery.recovered_with !== 'fallback' &&
        recovery.recovered_with !== 'last_resort'
      ) {
        this.fail(
          `Invalid recovery tier: ${String(recovery.recovered_with)}`,
        );
      }

      if (!Array.isArray(recovery.attempted) || recovery.attempted.length < 2) {
        this.fail(
          `Locator recovery for ${recovery.element} must contain at least two attempts.`,
        );
      }

      recovery.attempted.forEach((attempt, index) =>
        this.validateLocatorAttempt(attempt, `recovery ${recovery.element} attempt ${index + 1}`),
      );
    }

    for (const failure of locatorExecution.failures) {
      if (failure.test_case && !validTcIds.has(failure.test_case)) {
        this.fail(`Locator failure references unknown TC: ${failure.test_case}`);
      }
      if (!Array.isArray(failure.attempted) || failure.attempted.length < 1) {
        this.fail(`Locator failure for ${failure.element} must contain at least one attempt.`);
      }
      failure.attempted.forEach((attempt, index) =>
        this.validateLocatorAttempt(attempt, `failure ${failure.element} attempt ${index + 1}`),
      );
    }
  }

  private validateLocatorAttempt(attempt: LocatorAttemptRecord, label: string): void {
    if (!LOCATOR_TIERS.has(attempt.tier)) {
      this.fail(`Invalid locator tier in ${label}: ${String(attempt.tier)}`);
    }
    if (!LOCATOR_STRATEGIES.has(attempt.strategy)) {
      this.fail(`Invalid locator strategy in ${label}: ${String(attempt.strategy)}`);
    }
    if (attempt.result !== 'passed' && attempt.result !== 'failed') {
      this.fail(`Invalid locator attempt result in ${label}: ${String(attempt.result)}`);
    }
    if (attempt.match_count !== undefined && attempt.match_count !== null) {
      if (!Number.isInteger(attempt.match_count) || attempt.match_count < 0) {
        this.fail(`Invalid locator match_count in ${label}.`);
      }
    }
  }

  private validateFailures(record: RunRecord): void {
    const validTcIds = new Set(
      record.run.test_cases.map((tc) => tc.id),
    );

    const failureIds = record.run.failures.map(
      (failure) => failure.id,
    );

    this.assertUnique(failureIds, 'run.failures[].id');

    for (const failure of record.run.failures) {
      this.requireNonEmptyString(failure.id, 'run.failures[].id');
      this.requireNonEmptyString(failure.test_case, 'run.failures[].test_case');
      this.requireNonEmptyString(failure.step, 'run.failures[].step');
      this.requireNonEmptyString(failure.summary, 'run.failures[].summary');

      if (!validTcIds.has(failure.test_case)) {
        this.fail(
          `Failure ${failure.id} references unknown TC ${failure.test_case}.`,
        );
      }

      if (!FAILURE_CLASSIFICATIONS.has(failure.classification)) {
        this.fail(`Failure ${failure.id} has unsupported classification ${String(failure.classification)}.`);
      }

      if (
        failure.classification === 'application_failure' &&
        failure.automation.repair_required
      ) {
        this.fail(
          `Application failure ${failure.id} cannot automatically require automation repair.`,
        );
      }

      if (
        failure.classification === 'unknown' &&
        failure.automation.repair_required
      ) {
        this.fail(
          `Unknown failure ${failure.id} cannot automatically require automation repair.`,
        );
      }
    }

    const failureIdSet = new Set(failureIds);

    for (const testCase of record.run.test_cases) {
      for (const failureId of testCase.failure_ids) {
        if (!failureIdSet.has(failureId)) {
          this.fail(
            `TC ${testCase.id} references unknown failure ID ${failureId}.`,
          );
        }
      }
    }
  }

  private validateEvidence(record: RunRecord): void {
    const evidence = record.run.evidence;

    if (evidence.captured !== (evidence.items.length > 0)) {
      this.fail('run.evidence.captured must match whether evidence items were actually recorded.');
    }

    for (const item of evidence.items) {
      this.requireNonEmptyString(item.type, 'run.evidence.items[].type');
      this.requireNonEmptyString(item.path, 'run.evidence.items[].path');
      if (item.path.includes('\\') || /^[A-Za-z]:[\\/]/.test(item.path) || item.path.startsWith('/')) {
        this.fail(`Evidence path must be workspace-relative: ${item.path}`);
      }
    }

    if (evidence.capture_error) {
      for (const [key, value] of Object.entries(evidence.capture_error)) {
        if (typeof value !== 'string' || value.trim().length === 0) {
          this.fail(`run.evidence.capture_error.${key} must be a non-empty string.`);
        }
      }
    }
  }

  private validateTransition(record: RunRecord): void {
    const transition = record.run.status_transition;

    if (transition.from !== record.run.map_status_before) {
      this.fail(
        'status_transition.from must match run.map_status_before.',
      );
    }

    if (transition.to !== record.run.map_status_after) {
      this.fail(
        'status_transition.to must match run.map_status_after.',
      );
    }

    const actuallyChanged = transition.from !== transition.to;

    if (transition.changed !== actuallyChanged) {
      this.fail(
        `status_transition.changed must be ${String(actuallyChanged)} for ${transition.from} -> ${transition.to}.`,
      );
    }

    if (transition.changed && !transition.reason) {
      this.fail(
        'A changed Map status transition must include an explicit reason.',
      );
    }
  }

  private validateAgentSummary(record: RunRecord): void {
    const summary = record.run.agent_summary;

    this.requireNonEmptyString(
      summary.health,
      'run.agent_summary.health',
    );

    this.requireNonEmptyString(
      summary.recommended_action,
      'run.agent_summary.recommended_action',
    );

    this.requireNonEmptyString(
      summary.message,
      'run.agent_summary.message',
    );

    if (
      typeof summary.automation_action_required !== 'boolean'
    ) {
      this.fail(
        'run.agent_summary.automation_action_required must be boolean.',
      );
    }
  }

  /**
   * Refuse obvious secret-bearing properties before historical YAML is written.
   * References such as user_data_ref remain safe because their keys are not
   * secret-bearing values themselves.
   */
  private assertNoSensitiveKeys(value: unknown, path = 'run'): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        this.assertNoSensitiveKeys(item, `${path}[${index}]`),
      );
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const normalized = key.toLowerCase();

      if (SENSITIVE_KEYS.has(normalized)) {
        this.fail(
          `Sensitive field "${path}.${key}" must not be persisted in Run history. Store a project data/config reference instead.`,
        );
      }

      this.assertNoSensitiveKeys(nested, `${path}.${key}`);
    }
  }

  /**
   * Hard-link finalization provides atomic create-without-overwrite on normal
   * local filesystems. If the filesystem does not support hard links, fall
   * back to same-directory rename after confirming the Flow lock left the
   * destination unused.
   */
  private async atomicFinalize(
    tempPath: string,
    finalPath: string,
  ): Promise<void> {
    try {
      await link(tempPath, finalPath);
      await rm(tempPath, { force: true });
      return;
    } catch (error) {
      const code = this.errorCode(error);

      /**
       * EEXIST must never be downgraded to rename because Run history is
       * immutable.
       */
      if (code === 'EEXIST') {
        throw new Error(
          `Run history already exists and will not be overwritten: ${finalPath}`,
        );
      }

      if (
        code !== 'EPERM' &&
        code !== 'EACCES' &&
        code !== 'ENOTSUP' &&
        code !== 'EXDEV'
      ) {
        throw error;
      }
    }

    await this.assertFinalPathAvailable(finalPath);
    await rename(tempPath, finalPath);
  }

  private async assertFinalPathAvailable(
    finalPath: string,
  ): Promise<void> {
    try {
      await access(finalPath);
    } catch {
      return;
    }

    throw new Error(
      `Run history already exists and will not be overwritten: ${finalPath}`,
    );
  }

  private countResult(
    testCases: TestCaseExecutionRecord[],
    result: TestCaseExecutionRecord['result'],
  ): number {
    return testCases.filter((tc) => tc.result === result).length;
  }

  private sameStringSet(
    left: string[],
    right: string[],
  ): boolean {
    if (left.length !== right.length) {
      return false;
    }

    const rightSet = new Set(right);
    return left.every((value) => rightSet.has(value));
  }

  private assertUnique(
    values: string[],
    field: string,
  ): void {
    if (new Set(values).size !== values.length) {
      this.fail(`${field} must not contain duplicates.`);
    }
  }

  private requireNonEmptyString(
    value: unknown,
    field: string,
  ): asserts value is string {
    if (
      typeof value !== 'string' ||
      value.trim().length === 0
    ) {
      this.fail(`${field} must be a non-empty string.`);
    }
  }

  private requireFilesystemSafeRunId(
    runId: string,
  ): void {
    /**
     * Intentionally excludes ':' so timestamp IDs stay Windows-safe.
     */
    if (!/^[A-Za-z0-9._+@-]+$/.test(runId)) {
      this.fail(
        `run.id contains filesystem-unsafe characters: ${runId}`,
      );
    }
  }

  private requireValidDate(
    value: string,
    field: string,
  ): void {
    if (!Number.isFinite(Date.parse(value))) {
      this.fail(`${field} must be a valid ISO-style date/time.`);
    }
  }

  private expectEqual(
    actual: number,
    expected: number,
    field: string,
  ): void {
    if (actual !== expected) {
      this.fail(
        `${field} is inconsistent. Expected ${expected}, received ${actual}.`,
      );
    }
  }

  private errorCode(error: unknown): string | null {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
    ) {
      return (error as { code: string }).code;
    }

    return null;
  }

  private fail(message: string): never {
    throw new Error(
      `agentic-flow-builder Run validation failed: ${message}`,
    );
  }
}
