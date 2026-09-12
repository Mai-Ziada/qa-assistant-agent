import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  AgentSummary,
  EvidenceItem,
  FailureRecord,
  FlowMap,
  LocatorFailureRecord,
  LocatorRecoveryRecord,
  MapStatus,
  RunRecord,
  RunResult,
  RunSummary,
  RunType,
  ExecutionMode,
  TestCaseExecutionRecord,
} from '../types';
import { RunSessionError } from '../errors';

interface SessionState {
  runId: string;
  flowId: string;
  mapRevision: number;
  mapStatusBefore: MapStatus;
  runType: RunType;
  executionMode: ExecutionMode;
  startedAt: string;
  expectedTestCases: string[];
  testCases: Record<string, TestCaseExecutionRecord>;
  failures: FailureRecord[];
  recoveries: LocatorRecoveryRecord[];
  locatorFailures: LocatorFailureRecord[];
  evidence: EvidenceItem[];
  evidenceErrors: Record<string, string>;
}

export class RunSession {
  constructor(private readonly path: string, private state: SessionState) {}

  static async openOrCreate(input: {
    path: string;
    runId: string;
    map: FlowMap;
    runType: RunType;
    executionMode: ExecutionMode;
    expectedTestCases: string[];
  }): Promise<RunSession> {
    try {
      const existing = JSON.parse(await readFile(input.path, 'utf8')) as SessionState;
      if (existing.runId !== input.runId) throw new RunSessionError('Active Run Session belongs to another run.');
      if (existing.flowId !== input.map.flow.metadata.id) {
        throw new RunSessionError('Active Run Session belongs to another Flow.');
      }
      if (existing.mapRevision !== input.map.flow.metadata.revision) {
        throw new RunSessionError('Active Run Session was created for another Map revision.');
      }
      if (existing.runType !== input.runType || existing.executionMode !== input.executionMode) {
        throw new RunSessionError('Active Run Session execution contract does not match the requested run.');
      }
      const expected = [...input.expectedTestCases].sort();
      const activeExpected = [...existing.expectedTestCases].sort();
      if (expected.length !== activeExpected.length || expected.some((id, index) => id !== activeExpected[index])) {
        throw new RunSessionError('Active Run Session TC selection does not match the requested run.');
      }
      return new RunSession(input.path, existing);
    } catch (error) {
      if (error instanceof RunSessionError) throw error;
    }

    const state: SessionState = {
      runId: input.runId,
      flowId: input.map.flow.metadata.id,
      mapRevision: input.map.flow.metadata.revision,
      mapStatusBefore: input.map.flow.metadata.status,
      runType: input.runType,
      executionMode: input.executionMode,
      startedAt: new Date().toISOString(),
      expectedTestCases: [...input.expectedTestCases],
      testCases: {},
      failures: [],
      recoveries: [],
      locatorFailures: [],
      evidence: [],
      evidenceErrors: {},
    };
    const session = new RunSession(input.path, state);
    await session.persist();
    return session;
  }

  get runId(): string { return this.state.runId; }
  get flowId(): string { return this.state.flowId; }
  get expectedTestCases(): string[] { return [...this.state.expectedTestCases]; }
  get mapStatusBefore(): MapStatus { return this.state.mapStatusBefore; }

  async record(input: {
    testCase: TestCaseExecutionRecord;
    failures: FailureRecord[];
    recoveries: LocatorRecoveryRecord[];
    locatorFailures: LocatorFailureRecord[];
    evidence: EvidenceItem[];
    evidenceErrors?: Record<string, string>;
  }): Promise<void> {
    this.state.testCases[input.testCase.id] = input.testCase;
    this.state.failures = this.state.failures.filter((failure) => failure.test_case !== input.testCase.id).concat(input.failures);
    this.state.recoveries = this.state.recoveries.filter((recovery) => recovery.test_case !== input.testCase.id).concat(input.recoveries);
    this.state.locatorFailures = this.state.locatorFailures.filter((failure) => failure.test_case !== input.testCase.id).concat(input.locatorFailures);
    this.state.evidence = this.state.evidence.filter((item) => item.test_case !== input.testCase.id).concat(input.evidence);
    this.state.evidenceErrors = { ...this.state.evidenceErrors, ...(input.evidenceErrors ?? {}) };
    await this.persist();
  }

  isComplete(): boolean {
    return this.state.expectedTestCases.every((id) => Boolean(this.state.testCases[id]));
  }

  async remove(): Promise<void> {
    await rm(this.path, { force: true });
  }

  buildRunRecord(input: {
    map: FlowMap;
    mapStatusAfter: MapStatus;
    transition: RunRecord['run']['status_transition'];
    agentSummary: AgentSummary;
  }): RunRecord {
    if (!this.isComplete()) throw new RunSessionError('Cannot finalize incomplete Run Session.');
    const testCases = this.state.expectedTestCases.map((id) => this.state.testCases[id]);
    const result = this.aggregateResult(testCases, this.state.recoveries);
    const summary = this.buildSummary(testCases, this.state.failures, this.state.recoveries);
    const finishedAt = new Date().toISOString();

    return {
      run: {
        id: this.state.runId,
        flow: this.state.flowId,
        started_at: this.state.startedAt,
        finished_at: finishedAt,
        duration_ms: Math.max(0, Date.parse(finishedAt) - Date.parse(this.state.startedAt)),
        type: this.state.runType,
        execution_mode: this.state.executionMode,
        map_revision: this.state.mapRevision,
        map_status_before: this.state.mapStatusBefore,
        map_status_after: input.mapStatusAfter,
        selection: {
          mode: this.state.expectedTestCases.length === input.map.flow.test_cases.length ? 'all_test_cases' : 'selected_test_cases',
          test_cases: [...this.state.expectedTestCases],
        },
        actor: {
          role: input.map.flow.execution.role ?? null,
          auth_mode: input.map.flow.execution.auth.mode,
        },
        result,
        summary,
        test_cases: testCases,
        locator_execution: {
          strategy_mode: this.state.executionMode,
          recoveries: this.state.recoveries,
          failures: this.state.locatorFailures,
        },
        failures: this.state.failures,
        evidence: {
          captured: this.state.evidence.length > 0,
          items: this.state.evidence,
          capture_error: Object.keys(this.state.evidenceErrors).length > 0 ? this.state.evidenceErrors : null,
        },
        status_transition: input.transition,
        agent_summary: input.agentSummary,
      },
    };
  }

  snapshotForPreview(input: { map: FlowMap; agentSummary: AgentSummary }): RunRecord {
    const testCases = this.state.expectedTestCases.map((id) => this.state.testCases[id]).filter(Boolean);
    const result = this.aggregateResult(testCases, this.state.recoveries);
    const summary = this.buildSummary(testCases, this.state.failures, this.state.recoveries);
    return {
      run: {
        id: this.state.runId,
        flow: this.state.flowId,
        started_at: this.state.startedAt,
        finished_at: null,
        duration_ms: null,
        type: this.state.runType,
        execution_mode: this.state.executionMode,
        map_revision: this.state.mapRevision,
        map_status_before: this.state.mapStatusBefore,
        map_status_after: this.state.mapStatusBefore,
        selection: {
          mode: this.state.expectedTestCases.length === input.map.flow.test_cases.length ? 'all_test_cases' : 'selected_test_cases',
          test_cases: [...this.state.expectedTestCases],
        },
        actor: { role: input.map.flow.execution.role ?? null, auth_mode: input.map.flow.execution.auth.mode },
        result,
        summary,
        test_cases: testCases,
        locator_execution: { strategy_mode: this.state.executionMode, recoveries: this.state.recoveries, failures: this.state.locatorFailures },
        failures: this.state.failures,
        evidence: { captured: this.state.evidence.length > 0, items: this.state.evidence, capture_error: null },
        status_transition: { changed: false, from: this.state.mapStatusBefore, to: this.state.mapStatusBefore, reason: null },
        agent_summary: input.agentSummary,
      },
    };
  }

  private aggregateResult(testCases: TestCaseExecutionRecord[], recoveries: LocatorRecoveryRecord[]): RunResult {
    const passed = testCases.filter((tc) => tc.result === 'passed').length;
    const failed = testCases.filter((tc) => tc.result === 'failed').length;
    const blocked = testCases.filter((tc) => tc.result === 'blocked').length;

    if (failed > 0) return passed > 0 ? 'partial_failed' : 'failed';
    if (blocked > 0) return passed > 0 ? 'partial_blocked' : 'blocked';
    if (passed > 0 && recoveries.length > 0) return 'passed_with_recovery';
    return passed > 0 ? 'passed' : 'blocked';
  }

  private buildSummary(testCases: TestCaseExecutionRecord[], failures: FailureRecord[], recoveries: LocatorRecoveryRecord[]): RunSummary {
    const passed = testCases.filter((tc) => tc.result === 'passed').length;
    const failed = testCases.filter((tc) => tc.result === 'failed').length;
    const blocked = testCases.filter((tc) => tc.result === 'blocked').length;
    const total = testCases.length;
    return {
      total_test_cases: total,
      passed,
      failed,
      blocked,
      pass_rate: total > 0 ? Math.round((passed / total) * 10000) / 100 : null,
      total_steps: testCases.reduce((sum, tc) => sum + tc.steps.length, 0),
      completed_steps: testCases.reduce((sum, tc) => sum + tc.steps.filter((step) => step.result === 'passed').length, 0),
      locator_recoveries: recoveries.length,
      automation_failures: failures.filter((failure) => failure.automation.repair_required).length,
      application_failures: failures.filter((failure) => failure.classification === 'application_failure').length,
      other_failures: failures.filter((failure) => failure.classification !== 'application_failure' && !failure.automation.repair_required).length,
    };
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temp = join(dirname(this.path), `.session-${process.pid}-${Date.now()}.tmp`);
    await writeFile(temp, JSON.stringify(this.state, null, 2), 'utf8');
    await rename(temp, this.path);
  }
}
