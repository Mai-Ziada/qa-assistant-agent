import type { Browser, BrowserContext, Locator, Page, TestInfo } from '@playwright/test';

export type ExecutionMode = 'normal' | 'primary_only' | 'fallback_only' | 'last_resort_only';
export type LocatorTier = 'primary' | 'fallback' | 'last_resort';
export type LocatorStrategy = 'test_id' | 'role' | 'label' | 'scoped' | 'placeholder' | 'text' | 'alt_text' | 'attribute' | 'css' | 'xpath' | 'nth';
export type LocatorQuality = 'high' | 'medium' | 'low' | 'brittle';
export type LocatorValidationStatus = 'pending' | 'validated' | 'failed';
export type MapStatus = 'drafted' | 'primary_validated' | 'fallback_validated' | 'verified' | 'degraded' | 'degraded_critical' | 'broken' | 'revalidation_required';
export type RunType = 'verification' | 'normal' | 'revalidation' | 'repair_validation';
export type TestCaseResult = 'passed' | 'failed' | 'blocked';
export type RunResult = 'passed' | 'passed_with_recovery' | 'partial_failed' | 'partial_blocked' | 'failed' | 'blocked';
export type FailureClassification = 'application_failure' | 'locator_failure' | 'interaction_failure' | 'assertion_failure' | 'data_failure' | 'auth_failure' | 'environment_failure' | 'navigation_failure' | 'automation_code_failure' | 'unknown';
export type FailurePhase = 'locator_resolution' | 'interaction' | 'assertion' | 'navigation' | 'authentication' | 'data' | 'runtime' | 'unknown';

export interface LocatorDescriptor {
  strategy: LocatorStrategy;
  value: Record<string, unknown>;
  quality: LocatorQuality;
  validation_status: LocatorValidationStatus;
  notes?: string;
}

export interface ElementLocators {
  primary: LocatorDescriptor;
  fallback: LocatorDescriptor;
  last_resort: LocatorDescriptor;
}

export interface TargetContract {
  role?: string;
  accessible_name?: string;
  label?: string;
  tag?: string;
  input_type?: string;
  expected_text?: string;
  container?: string;
  unique?: boolean;
  editable?: boolean;
}

export interface KnowledgeSource {
  type: 'discovered' | 'reused';
  from_flow?: string;
  from_element?: string;
  source_revision?: number;
}

export type InteractionMethodName = 'click' | 'fill' | 'clear' | 'check' | 'uncheck' | 'selectOption' | 'setInputFiles' | 'press' | 'pressSequentially' | 'hover' | 'dragTo';

export interface InteractionMethod {
  method: InteractionMethodName;
  data_ref?: string;
  key?: string;
  target_element?: string;
  value?: unknown;
  options?: Record<string, unknown>;
}

export interface InteractionAlternative extends InteractionMethod {
  allowed_when?: string[];
  automatic_fallback: false;
}

export interface InteractionDefinition {
  preferred: InteractionMethod;
  alternatives?: InteractionAlternative[];
}

export interface ExpectedState {
  after_action?: { assertions?: string[] };
}

export interface FlowElement {
  description: string;
  used_in: string[];
  knowledge_source: KnowledgeSource;
  target_contract: TargetContract;
  locators: ElementLocators;
  interaction: InteractionDefinition;
  expected_state?: ExpectedState;
}

export type AssertionType = 'visible' | 'hidden' | 'enabled' | 'disabled' | 'text' | 'value' | 'checked' | 'count' | 'url' | 'business_state';

export interface AssertionTarget {
  element?: string;
  locator?: { strategy: LocatorStrategy; value: Record<string, unknown> };
}

export interface AssertionDefinition {
  after_step?: string;
  type: AssertionType;
  target: AssertionTarget;
  expected: unknown;
  business_critical?: boolean;
}

export interface FlowStepDefinition {
  id: string;
  name: string;
  description?: string;
  module?: string;
  optional?: boolean;
}

export interface FlowTestCaseDefinition {
  id: string;
  name: string;
  description?: string;
  steps: string[] | { from: string; to: string };
  data?: { ref?: string; refs?: string[] };
  expected_result: unknown;
  preconditions?: string[];
  depends_on?: string[];
  tags?: string[];
}

export interface VerificationRunReference {
  run_id: string;
  result: RunResult;
  map_revision?: number;
}

export interface FlowMap {
  flow: {
    steps: FlowStepDefinition[];
    metadata: {
      id: string;
      name: string;
      description: string;
      module?: string | null;
      type: string;
      status: MapStatus;
      revision: number;
      created_at: string;
      updated_at: string;
      tags?: string[];
    };
    execution: {
      start_url?: string | null;
      role?: string | null;
      auth: {
        mode: 'inline' | 'flow_scoped_shared' | 'none';
        user_data_ref?: string | null;
        isolation: { cross_flow_session_reuse: false };
      };
      timeout_profile?: string | null;
    };
    data: {
      sources: Array<{
        id: string;
        ref: string;
        description?: string;
        run_scoped?: boolean;
      }>;
    };
    test_cases: FlowTestCaseDefinition[];
    elements: Record<string, FlowElement>;
    assertions: Record<string, AssertionDefinition>;
    verification: {
      required_strategies: {
        primary: { required: boolean };
        fallback: { required: boolean };
        last_resort: { required: boolean };
      };
      current_revision: number;
      verified_revision: number | null;
      latest_runs: {
        primary: VerificationRunReference | null;
        fallback: VerificationRunReference | null;
        last_resort: VerificationRunReference | null;
      };
      revalidation_reason?: {
        type?: string;
        element?: string;
        changed?: string[];
        detected_at?: string;
      } | null;
    };
    project: {
      data_root?: string | null;
      evidence_root?: string | null;
      evidence: {
        capture_on_pass: false;
        capture_on_failure: boolean;
        screenshot_on_failure: boolean;
        trace_on_failure: boolean;
      };
    };
    agent_notes?: string[];
    change_reason?: {
      type?: string;
      source_run?: string;
      affected_element?: string;
      previous_revision?: number;
      description?: string;
    } | null;
  };
}

export interface LocatorAttemptRecord {
  tier: LocatorTier;
  strategy: LocatorStrategy;
  result: 'passed' | 'failed';
  reason?: string;
  target_contract_valid?: boolean | null;
  match_count?: number | null;
  error?: { type: string; message: string };
}

export interface ResolvedTarget {
  elementId: string;
  locator: Locator;
  tier: LocatorTier;
  strategy: LocatorStrategy;
  attempts: LocatorAttemptRecord[];
  recovered: boolean;
}

export interface RuntimeRunContext {
  runId: string;
  flowId: string;
  mapRevision: number;
  runType: RunType;
  executionMode: ExecutionMode;
  testCaseId?: string;
  stepId?: string;
}

export interface FlowFailureSignal {
  flowId: string;
  testCaseId?: string;
  stepId?: string;
  elementId?: string;
  phase: FailurePhase;
  message: string;
  locatorAttempts?: LocatorAttemptRecord[];
  locatorResolved?: boolean | null;
  interactionCompleted?: boolean | null;
  expected?: unknown;
  actual?: unknown;
  cause?: unknown;
  metadata?: Record<string, unknown>;
}

export type RuntimeSignal =
  | { type: 'step_started'; at: string; testCaseId: string; stepId: string }
  | { type: 'step_completed'; at: string; testCaseId: string; stepId: string }
  | { type: 'locator_recovery'; at: string; testCaseId?: string; stepId?: string; elementId: string; recoveredWith: LocatorTier; attempts: LocatorAttemptRecord[] }
  | { type: 'interaction_completed'; at: string; testCaseId?: string; stepId?: string; elementId: string; method: InteractionMethodName }
  | { type: 'assertion_completed'; at: string; testCaseId?: string; stepId?: string; assertionId: string }
  | { type: 'failure_signal'; at: string; signal: FlowFailureSignal };

export interface RuntimeSignalSink {
  emit(signal: RuntimeSignal): void | Promise<void>;
}

export interface RuntimeDataResolver {
  resolve<T = unknown>(ref: string, context: RuntimeRunContext): Promise<T>;
}

export interface RuntimeAuthManager {
  prepareFlowScoped?(browser: Browser, map: FlowMap, context: RuntimeRunContext): Promise<void>;
  applyFlowScoped?(browserContext: BrowserContext, page: Page, map: FlowMap, context: RuntimeRunContext): Promise<void>;
  authenticateInline?(page: Page, map: FlowMap, context: RuntimeRunContext, userDataRef?: string): Promise<void>;
  cleanup?(map: FlowMap, context: RuntimeRunContext): Promise<void>;
}

export interface RuntimeComponentContext {
  page: Page;
  flowMap: FlowMap;
  run: RuntimeRunContext;
  signals: RuntimeSignalSink;
  dataResolver?: RuntimeDataResolver;
  authManager?: RuntimeAuthManager;
}

export interface EvidenceItem {
  type: 'screenshot' | 'trace' | 'console' | 'network' | 'log' | 'other';
  test_case?: string | null;
  path: string;
  reason?: string | null;
  description?: string | null;
}

export interface StepExecutionRecord {
  id: string;
  name?: string;
  result: 'passed' | 'failed' | 'blocked';
  duration_ms?: number | null;
}

export interface FailureRecord {
  id: string;
  test_case: string;
  step: string;
  element?: string | null;
  classification: FailureClassification;
  summary: string;
  phase?: FailurePhase | null;
  automation: {
    locator_resolved?: boolean | null;
    interaction_completed?: boolean | null;
    repair_required: boolean;
  };
  expected?: unknown;
  actual?: unknown;
  locator_attempts?: LocatorAttemptRecord[];
  application_observation?: Record<string, unknown> | null;
  recovery?: { succeeded: boolean; strategy?: string } | null;
}

export interface TestCaseExecutionRecord {
  id: string;
  name: string;
  result: TestCaseResult;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  data?: { ref?: string; refs?: string[]; instance_id?: string };
  steps: StepExecutionRecord[];
  blocked_by?: { test_case?: string; reason: string } | null;
  failure_ids: string[];
}

export interface LocatorRecoveryRecord {
  test_case?: string;
  element: string;
  step: string;
  attempted: LocatorAttemptRecord[];
  recovered_with: 'fallback' | 'last_resort';
}

export interface LocatorFailureRecord {
  test_case?: string;
  element: string;
  step: string;
  attempted: LocatorAttemptRecord[];
}

export interface RunSummary {
  total_test_cases: number;
  passed: number;
  failed: number;
  blocked: number;
  pass_rate: number | null;
  total_steps?: number | null;
  completed_steps?: number | null;
  locator_recoveries: number;
  automation_failures: number;
  application_failures: number;
  other_failures: number;
}

export interface StatusTransition {
  changed: boolean;
  from: MapStatus;
  to: MapStatus;
  reason: string | null;
}

export interface AgentSummary {
  health: 'healthy' | 'degraded' | 'degraded_critical' | 'product_failure' | 'automation_failure' | 'blocked' | 'mixed_failure' | 'unknown';
  automation_action_required: boolean;
  recommended_action: 'none' | 'report_application_failure' | 'analyze_failure' | 'repair_locator' | 'repair_interaction' | 'repair_automation_code' | 'repair_data' | 'investigate_auth' | 'investigate_environment' | 'revalidate_flow' | 'update_flow' | 'manual_review';
  message: string;
}

export interface RunRecord {
  run: {
    id: string;
    flow: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    type: RunType;
    execution_mode: ExecutionMode;
    map_revision: number;
    map_status_before: MapStatus;
    map_status_after: MapStatus;
    selection: {
      mode: 'all_test_cases' | 'selected_test_cases';
      test_cases: string[];
    };
    environment?: {
      base_url?: string | null;
      browser?: string;
      browser_version?: string | null;
      viewport?: { width: number; height: number } | null;
      project?: string | null;
    };
    actor: {
      role?: string | null;
      auth_mode: 'inline' | 'flow_scoped_shared' | 'none';
    };
    result: RunResult;
    summary: RunSummary;
    test_cases: TestCaseExecutionRecord[];
    locator_execution: {
      strategy_mode: ExecutionMode;
      recoveries: LocatorRecoveryRecord[];
      failures: LocatorFailureRecord[];
    };
    failures: FailureRecord[];
    evidence: {
      captured: boolean;
      items: EvidenceItem[];
      capture_error?: Record<string, string> | null;
    };
    status_transition: StatusTransition;
    agent_summary: AgentSummary;
  };
}

export interface RuntimeSignalsSnapshot {
  signals: RuntimeSignal[];
}

export interface FlowRunControllerOptions {
  mapPath: string;
  flowDir: string;
  evidenceRoot?: string;
  runType?: RunType;
  executionMode?: ExecutionMode;
  selectedTestCases?: string[];
  dataResolver?: RuntimeDataResolver;
  authManager?: RuntimeAuthManager;
}

export interface FlowRunControllerLike {
  beforeAll(browser: Browser): Promise<void>;
  runtimeFor(page: Page, testInfo: TestInfo, testCaseId: string): Promise<unknown>;
  afterEach(page: Page, testInfo: TestInfo): Promise<void>;
  finalizeIfComplete(): Promise<void>;
}
