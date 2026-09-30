import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { Browser, Page, TestInfo } from '@playwright/test';
import { FlowRuntime } from '../flow-runtime';
import type {
  AgentSummary,
  FlowFailureSignal,
  FlowMap,
  FlowRunControllerOptions,
  LocatorFailureRecord,
  LocatorRecoveryRecord,
  RunRecord,
  RuntimeSignal,
  RuntimeSignalSink,
  TestCaseExecutionRecord,
} from '../types';
import { DiagnosisEngine } from './diagnosis-engine';
import { EvidenceManager } from './evidence-manager';
import { FlowLock } from './flow-lock';
import { MapStateManager } from './map-state-manager';
import { MapStore } from './map-store';
import { RunSession } from './run-session';
import { RunWriter } from './run-writer';

class MemorySignalSink implements RuntimeSignalSink {
  readonly signals: RuntimeSignal[] = [];
  emit(signal: RuntimeSignal): void {
    this.signals.push(signal);
  }
}

interface ActiveRunRecord {
  runId: string;
  createdAt: string;
}

export class FlowRunController {
  private map?: FlowMap;
  private runId?: string;
  private session?: RunSession;
  private lock?: FlowLock;
  private readonly sinks = new Map<string, MemorySignalSink>();
  private readonly mapStore: MapStore;
  private readonly diagnosis = new DiagnosisEngine();
  private readonly stateManager = new MapStateManager();
  private finalized = false;

  constructor(private readonly options: FlowRunControllerOptions) {
    this.mapStore = new MapStore(options.mapPath);
  }

  async beforeAll(browser: Browser): Promise<void> {
    try {
      this.map = await this.mapStore.read();
      this.runId = await this.getOrCreateRunId();
      this.lock = new FlowLock(join(this.options.flowDir, '.flow.lock'));
      await this.lock.acquireOrJoin(this.runId);

      const runType = this.options.runType ?? this.readRunType();
      const executionMode = this.options.executionMode ?? this.readExecutionMode();
      const selected = this.resolveSelectedTestCases(this.map);
      this.validateExecutionContract(this.map, runType, executionMode, selected);
      this.session = await RunSession.openOrCreate({
        path: this.sessionPath(this.runId),
        runId: this.runId,
        map: this.map,
        runType,
        executionMode,
        expectedTestCases: selected,
      });

      if (this.map.flow.execution.auth.mode === 'flow_scoped_shared') {
        if (!this.options.authManager?.prepareFlowScoped) {
          throw new Error('flow_scoped_shared auth requires an authManager with prepareFlowScoped().');
        }
        await this.options.authManager.prepareFlowScoped(browser, this.map, {
          runId: this.runId,
          flowId: this.map.flow.metadata.id,
          mapRevision: this.map.flow.metadata.revision,
          runType,
          executionMode,
        });
      }
    } catch (error) {
      await this.cleanupInitializationFailure();
      throw error;
    }
  }

  async runtimeFor(page: Page, testInfo: TestInfo, testCaseId: string): Promise<FlowRuntime> {
    const map = this.requireMap();
    const session = this.requireSession();
    if (!session.expectedTestCases.includes(testCaseId)) {
      throw new Error(`TC "${testCaseId}" is not selected for run "${session.runId}".`);
    }

    const sink = new MemorySignalSink();
    this.sinks.set(testCaseId, sink);
    if (!testInfo.annotations.some((annotation) => annotation.type === 'afb_tc_id')) {
      testInfo.annotations.push({ type: 'afb_tc_id', description: testCaseId });
    }
    const runType = this.options.runType ?? this.readRunType();
    const executionMode = this.options.executionMode ?? this.readExecutionMode();
    const runContext = {
      runId: session.runId,
      flowId: map.flow.metadata.id,
      mapRevision: map.flow.metadata.revision,
      runType,
      executionMode,
      testCaseId,
    } as const;

    if (map.flow.execution.auth.mode === 'flow_scoped_shared') {
      if (!this.options.authManager?.applyFlowScoped) {
        throw new Error('flow_scoped_shared auth requires an authManager with applyFlowScoped().');
      }
      await this.options.authManager.applyFlowScoped(page.context(), page, map, runContext);
    }

    return new FlowRuntime({
      page,
      flowMap: map,
      run: runContext,
      signals: sink,
      dataResolver: this.options.dataResolver,
      authManager: this.options.authManager,
    });
  }

  async afterEach(page: Page, testInfo: TestInfo): Promise<void> {
    const annotation = testInfo.annotations.find((item) => item.type === 'afb_tc_id');
    const testCaseId = annotation?.description;
    if (!testCaseId) return;
    const map = this.requireMap();
    const session = this.requireSession();

    const maxRetries = typeof testInfo.project.retries === 'number' ? testInfo.project.retries : 0;
    const terminalAttempt = testInfo.status === 'passed' || testInfo.status === 'skipped' || testInfo.retry >= maxRetries;
    if (!terminalAttempt) return;

    const sink = this.sinks.get(testCaseId) ?? new MemorySignalSink();
    const failureSignals = sink.signals
      .filter((signal): signal is Extract<RuntimeSignal, { type: 'failure_signal' }> => signal.type === 'failure_signal')
      .map((signal) => signal.signal);

    if (testInfo.status !== 'passed' && testInfo.status !== 'skipped' && failureSignals.length === 0) {
      failureSignals.push({
        flowId: map.flow.metadata.id,
        testCaseId,
        phase: 'unknown',
        message: testInfo.error?.message ?? `Playwright test ended with status "${testInfo.status}".`,
        metadata: { classificationHint: 'unknown' },
      });
    }

    const failures = failureSignals.map((signal, index) => this.diagnosis.toFailureRecord(signal, index));
    const recoveries = this.extractRecoveries(sink.signals, testCaseId);
    const locatorFailures = this.extractLocatorFailures(failureSignals, testCaseId);
    const tcDefinition = map.flow.test_cases.find((tc) => tc.id === testCaseId);
    if (!tcDefinition) throw new Error(`Unknown TC "${testCaseId}" in Flow Map.`);

    const testCase: TestCaseExecutionRecord = {
      id: testCaseId,
      name: tcDefinition.name,
      result: testInfo.status === 'passed' ? 'passed' : testInfo.status === 'skipped' ? 'blocked' : 'failed',
      started_at: new Date(Date.now() - testInfo.duration).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: testInfo.duration,
      steps: this.buildStepRecords(map, sink.signals, testInfo.status === 'passed'),
      blocked_by: testInfo.status === 'skipped' ? { reason: 'Playwright reported skipped/blocked execution.' } : null,
      failure_ids: failures.map((failure) => failure.id),
    };

    let evidenceItems = [] as RunRecord['run']['evidence']['items'];
    let evidenceErrors: Record<string, string> = {};
    if (testCase.result === 'failed' && map.flow.project.evidence.capture_on_failure) {
      const evidenceRoot = this.resolveEvidenceRoot(map);
      const workspaceRoot = this.resolveWorkspaceRoot();
      const manager = new EvidenceManager(evidenceRoot, workspaceRoot);
      const evidence = await manager.captureFailure({
        page,
        testInfo,
        flowId: map.flow.metadata.id,
        runId: session.runId,
        testCaseId,
        shortName: failures[0]?.classification ?? 'failure',
        screenshot: map.flow.project.evidence.screenshot_on_failure,
        trace: map.flow.project.evidence.trace_on_failure,
      });
      evidenceItems = evidence.items;
      evidenceErrors = evidence.errors;
    }

    await session.record({
      testCase,
      failures,
      recoveries,
      locatorFailures,
      evidence: evidenceItems,
      evidenceErrors,
    });

    await this.finalizeIfComplete();
  }

  async finalizeIfComplete(): Promise<void> {
    if (this.finalized) return;
    if (!this.session || !this.map || !this.runId || !this.lock) return;

    const runId = this.runId;
    const lock = this.lock;
    const runType = this.options.runType ?? this.readRunType();
    const executionMode = this.options.executionMode ?? this.readExecutionMode();
    const session = await RunSession.openOrCreate({
      path: this.sessionPath(runId),
      runId,
      map: this.map,
      runType,
      executionMode,
      expectedTestCases: this.session.expectedTestCases,
    });
    this.session = session;
    if (!session.isComplete()) return;

    // From here on the Run has genuinely completed: whatever happens while building or writing
    // it, the session file, the active-run marker and the Flow lock are all released below, so a
    // failed finalization (e.g. a run-validation throw) never blocks the next Run. The original
    // error -- or the first cleanup error if finalization itself succeeded -- is rethrown
    // afterwards so the Run still fails visibly.
    let finalizationError: unknown;
    let mapForCleanup = this.map;
    try {
      const preliminarySummary = this.buildAgentSummary(session.snapshotForPreview({
        map: this.map,
        agentSummary: this.defaultAgentSummary(),
      }));
      const preview = session.snapshotForPreview({ map: this.map, agentSummary: preliminarySummary });
      const state = this.stateManager.applyRun(this.map, preview);
      const finalAgentSummary = this.buildAgentSummary({
        ...preview,
        run: {
          ...preview.run,
          map_status_after: state.map.flow.metadata.status,
          status_transition: state.transition,
        },
      });
      const finalRecord = session.buildRunRecord({
        map: state.map,
        mapStatusAfter: state.map.flow.metadata.status,
        transition: state.transition,
        agentSummary: finalAgentSummary,
      });

      const writer = new RunWriter(join(this.options.flowDir, 'runs'));
      await writer.write(finalRecord);
      await this.mapStore.write(state.map);
      this.map = state.map;
      mapForCleanup = state.map;
    } catch (error) {
      finalizationError = error;
    }

    const cleanupErrors: unknown[] = [];
    const cleanup = async (action: () => Promise<unknown> | undefined): Promise<void> => {
      try {
        await action();
      } catch (error) {
        cleanupErrors.push(error);
      }
    };
    await cleanup(() => this.options.authManager?.cleanup?.(mapForCleanup, {
      runId,
      flowId: mapForCleanup.flow.metadata.id,
      mapRevision: mapForCleanup.flow.metadata.revision,
      runType,
      executionMode,
    }));
    await cleanup(() => session.remove());
    await cleanup(() => this.removeActiveRun(runId));
    await cleanup(() => lock.release(runId));

    this.finalized = true;
    this.session = undefined;
    this.lock = undefined;

    if (finalizationError !== undefined) throw finalizationError;
    if (cleanupErrors.length > 0) throw cleanupErrors[0];
  }

  private extractRecoveries(signals: RuntimeSignal[], testCaseId: string): LocatorRecoveryRecord[] {
    return signals
      .filter((signal): signal is Extract<RuntimeSignal, { type: 'locator_recovery' }> => signal.type === 'locator_recovery')
      .map((signal) => ({
        test_case: testCaseId,
        element: signal.elementId,
        step: signal.stepId ?? 'UNKNOWN-STEP',
        attempted: signal.attempts,
        recovered_with: signal.recoveredWith === 'last_resort' ? 'last_resort' : 'fallback',
      }));
  }

  private extractLocatorFailures(signals: FlowFailureSignal[], testCaseId: string): LocatorFailureRecord[] {
    return signals
      .filter((signal) => signal.phase === 'locator_resolution')
      .map((signal) => ({
        test_case: testCaseId,
        element: signal.elementId ?? 'UNKNOWN-ELEMENT',
        step: signal.stepId ?? 'UNKNOWN-STEP',
        attempted: signal.locatorAttempts ?? [],
      }));
  }

  private buildStepRecords(map: FlowMap, signals: RuntimeSignal[], testPassed: boolean): TestCaseExecutionRecord['steps'] {
    const starts = new Map<string, string>();
    const completed = new Set<string>();
    for (const signal of signals) {
      if (signal.type === 'step_started') starts.set(signal.stepId, signal.at);
      if (signal.type === 'step_completed') completed.add(signal.stepId);
    }
    return [...starts.entries()].map(([stepId]) => ({
      id: stepId,
      name: map.flow.steps.find((step) => step.id === stepId)?.name,
      result: completed.has(stepId) ? 'passed' : testPassed ? 'blocked' : 'failed',
    }));
  }

  private buildAgentSummary(record: RunRecord): AgentSummary {
    const run = record.run;
    const automationFailures = run.failures.filter((failure) => failure.automation.repair_required);
    const appFailures = run.failures.filter((failure) => failure.classification === 'application_failure');
    if (run.result === 'blocked') {
      return { health: 'blocked', automation_action_required: false, recommended_action: 'analyze_failure', message: 'The requested Flow execution was blocked.' };
    }
    const hasLocatorRecovery = run.locator_execution.recoveries.length > 0;

    if (automationFailures.length > 0 && appFailures.length > 0) {
      return { health: 'mixed_failure', automation_action_required: true, recommended_action: 'analyze_failure', message: 'Execution contains both automation-owned and application failures.' };
    }
    if (appFailures.length > 0 && hasLocatorRecovery) {
      return { health: 'mixed_failure', automation_action_required: true, recommended_action: 'analyze_failure', message: 'Application behavior failed and locator recovery was also required. Treat product behavior and automation health as separate issues.' };
    }
    if (automationFailures.length > 0) {
      const locatorOwned = automationFailures.some((failure) => failure.classification === 'locator_failure');
      return {
        health: 'automation_failure',
        automation_action_required: true,
        recommended_action: locatorOwned ? 'repair_locator' : 'analyze_failure',
        message: 'Confirmed automation-owned failure requires attention.',
      };
    }
    if (appFailures.length > 0) {
      return { health: 'product_failure', automation_action_required: false, recommended_action: 'report_application_failure', message: 'Application behavior failed while no confirmed automation repair is required.' };
    }
    if (run.locator_execution.recoveries.some((item) => item.recovered_with === 'last_resort')) {
      return { health: 'degraded_critical', automation_action_required: true, recommended_action: 'repair_locator', message: 'Flow passed but required Last Resort locator recovery.' };
    }
    if (run.locator_execution.recoveries.length > 0) {
      return { health: 'degraded', automation_action_required: true, recommended_action: 'repair_locator', message: 'Flow passed but required locator recovery.' };
    }
    if (run.failures.length > 0) {
      return { health: 'unknown', automation_action_required: false, recommended_action: 'analyze_failure', message: 'Failure exists without confirmed automation ownership.' };
    }
    return { health: 'healthy', automation_action_required: false, recommended_action: 'none', message: 'Execution completed without recorded recovery or failure.' };
  }

  private defaultAgentSummary(): AgentSummary {
    return { health: 'unknown', automation_action_required: false, recommended_action: 'none', message: 'Run is not finalized yet.' };
  }

  private validateExecutionContract(
    map: FlowMap,
    runType: NonNullable<FlowRunControllerOptions['runType']>,
    executionMode: NonNullable<FlowRunControllerOptions['executionMode']>,
    selected: string[],
  ): void {
    if (new Set(selected).size !== selected.length) {
      throw new Error('Selected TC IDs must not contain duplicates.');
    }

    const status = map.flow.metadata.status;
    const allTestCases = map.flow.test_cases.map((tc) => tc.id);
    const selectedSet = new Set(selected);
    const fullFlowSelected =
      selected.length === allTestCases.length &&
      allTestCases.every((id) => selectedSet.has(id));

    if (runType === 'normal') {
      if (executionMode !== 'normal') {
        throw new Error('Normal Flow Runs require execution_mode=normal.');
      }
      if (!['verified', 'degraded', 'degraded_critical'].includes(status)) {
        throw new Error(
          `Normal Flow Run is not allowed while Map status is "${status}". Verify/revalidate the Flow first.`,
        );
      }
      return;
    }

    if (runType === 'verification' || runType === 'revalidation') {
      if (executionMode === 'normal') {
        throw new Error(`${runType} requires a forced locator strategy mode.`);
      }
      if (!fullFlowSelected) {
        throw new Error(
          `${runType} must execute all Flow TCs. Use repair_validation for targeted/subset validation.`,
        );
      }
    }

    if (runType === 'verification') {
      const allowedInitialStates = ['drafted', 'primary_validated', 'fallback_validated'];
      if (!allowedInitialStates.includes(status)) {
        throw new Error(
          `Initial verification is only valid for DRAFTED/PRIMARY_VALIDATED/FALLBACK_VALIDATED Maps; current status is "${status}". Use normal RUN for an already verified Flow, or REPAIR/UPDATE followed by revalidation when the automation definition changes.`,
        );
      }

      const expectedMode =
        status === 'drafted'
          ? 'primary_only'
          : status === 'primary_validated'
            ? 'fallback_only'
            : 'last_resort_only';

      if (executionMode !== expectedMode) {
        throw new Error(
          `Initial verification for status "${status}" requires execution_mode="${expectedMode}"; received "${executionMode}".`,
        );
      }
    }

    if (runType === 'revalidation') {
      if (status !== 'revalidation_required') {
        throw new Error(
          `revalidation requires Map status "revalidation_required"; current status is "${status}".`,
        );
      }

      const revision = map.flow.metadata.revision;
      const latest = map.flow.verification.latest_runs;
      const passed = (ref: typeof latest.primary): boolean =>
        Boolean(ref && ref.result === 'passed' && ref.map_revision === revision);
      const expectedMode = !passed(latest.primary)
        ? 'primary_only'
        : !passed(latest.fallback)
          ? 'fallback_only'
          : 'last_resort_only';

      if (executionMode !== expectedMode) {
        throw new Error(
          `Revalidation for revision ${revision} requires execution_mode="${expectedMode}" next; received "${executionMode}".`,
        );
      }
    }

    if (runType === 'repair_validation') {
      if (status !== 'revalidation_required') {
        throw new Error(
          `repair_validation requires Map status "revalidation_required"; current status is "${status}".`,
        );
      }
      if (executionMode === 'normal') {
        throw new Error('repair_validation requires a forced locator strategy mode.');
      }
    }
  }

  private async cleanupInitializationFailure(): Promise<void> {
    const runId = this.runId;

    if (this.session) {
      await this.session.remove().catch(() => undefined);
    }

    if (runId) {
      await this.removeActiveRun(runId).catch(() => undefined);
    }

    if (this.lock && runId) {
      await this.lock.release(runId).catch(() => undefined);
    }

    this.session = undefined;
    this.lock = undefined;
  }

  private resolveSelectedTestCases(map: FlowMap): string[] {
    const explicit = this.options.selectedTestCases ?? this.readSelectedTestCases();
    const selected = explicit.length > 0 ? explicit : map.flow.test_cases.map((tc) => tc.id);
    const valid = new Set(map.flow.test_cases.map((tc) => tc.id));
    for (const id of selected) if (!valid.has(id)) throw new Error(`Selected unknown TC "${id}".`);
    return selected;
  }

  private readSelectedTestCases(): string[] {
    return (process.env.AFB_SELECTED_TCS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  }

  private readRunType(): FlowRunControllerOptions['runType'] extends infer T ? Exclude<T, undefined> : never {
    const value = process.env.AFB_RUN_TYPE ?? 'normal';
    if (!['verification', 'normal', 'revalidation', 'repair_validation'].includes(value)) throw new Error(`Invalid AFB_RUN_TYPE "${value}".`);
    return value as 'verification' | 'normal' | 'revalidation' | 'repair_validation';
  }

  private readExecutionMode(): FlowRunControllerOptions['executionMode'] extends infer T ? Exclude<T, undefined> : never {
    const value = process.env.AFB_EXECUTION_MODE ?? 'normal';
    if (!['normal', 'primary_only', 'fallback_only', 'last_resort_only'].includes(value)) throw new Error(`Invalid AFB_EXECUTION_MODE "${value}".`);
    return value as 'normal' | 'primary_only' | 'fallback_only' | 'last_resort_only';
  }

  private async getOrCreateRunId(): Promise<string> {
    if (process.env.AFB_RUN_ID) return process.env.AFB_RUN_ID;
    const activePath = this.activeRunPath();
    await mkdir(dirname(activePath), { recursive: true });
    try {
      const active = JSON.parse(await readFile(activePath, 'utf8')) as ActiveRunRecord;
      if (active.runId) return active.runId;
    } catch {
      // Create below.
    }
    const runId = this.createRunId();
    const record: ActiveRunRecord = { runId, createdAt: new Date().toISOString() };
    try {
      await writeFile(activePath, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
      return runId;
    } catch {
      const active = JSON.parse(await readFile(activePath, 'utf8')) as ActiveRunRecord;
      return active.runId;
    }
  }

  private async removeActiveRun(runId: string): Promise<void> {
    try {
      const active = JSON.parse(await readFile(this.activeRunPath(), 'utf8')) as ActiveRunRecord;
      if (active.runId === runId) await rm(this.activeRunPath(), { force: true });
    } catch {
      // Already removed.
    }
  }

  private activeRunPath(): string { return join(this.options.flowDir, 'runs', '.active-run.json'); }
  private sessionPath(runId: string): string { return join(this.options.flowDir, 'runs', '.sessions', `${runId}.json`); }

  private createRunId(): string {
    return new Date().toISOString().replace(/:(?=\d{2}(?:\.\d{3})?Z)/g, '-').replace(/\.\d{3}Z$/, '+00-00').replace(/:/g, '-');
  }

  private resolveEvidenceRoot(map: FlowMap): string {
    if (this.options.evidenceRoot) return resolve(this.options.evidenceRoot);
    const configured = map.flow.project.evidence_root;
    const workspaceRoot = this.resolveWorkspaceRoot();
    if (!configured) return join(workspaceRoot, 'evidences');
    return isAbsolute(configured) ? configured : resolve(workspaceRoot, configured);
  }

  private resolveWorkspaceRoot(): string {
    return resolve(this.options.flowDir, '..', '..', '..');
  }

  private requireMap(): FlowMap {
    if (!this.map) throw new Error('FlowRunController.beforeAll() must run before tests.');
    return this.map;
  }

  private requireSession(): RunSession {
    if (!this.session) throw new Error('FlowRunController.beforeAll() must run before tests.');
    return this.session;
  }
}

export function createFlowRunController(options: FlowRunControllerOptions): FlowRunController {
  return new FlowRunController(options);
}
