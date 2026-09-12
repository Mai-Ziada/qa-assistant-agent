import type { Page } from '@playwright/test';
import { AssertionEngine } from './assertion-engine';
import { AssertionExecutionError, InteractionExecutionError, LocatorResolutionError } from './errors';
import { InteractionEngine } from './interaction-engine';
import { LocatorResolver } from './locator-resolver';
import type {
  FlowFailureSignal,
  RuntimeComponentContext,
  RuntimeRunContext,
  RuntimeSignal,
} from './types';

export class FlowRuntime {
  private readonly locatorResolver: LocatorResolver;
  private readonly interactionEngine = new InteractionEngine();
  private readonly assertionEngine: AssertionEngine;
  private currentStepId?: string;

  constructor(private readonly context: RuntimeComponentContext) {
    this.locatorResolver = new LocatorResolver(
      context.page,
      context.flowMap,
      context.run.executionMode,
    );
    this.assertionEngine = new AssertionEngine(
      context.page,
      context.flowMap,
      this.locatorResolver,
    );
  }

  get page(): Page {
    return this.context.page;
  }

  get runContext(): RuntimeRunContext {
    return { ...this.context.run, stepId: this.currentStepId };
  }

  async step<T>(stepId: string, action: () => Promise<T>): Promise<T> {
    const step = this.context.flowMap.flow.steps.find((item) => item.id === stepId);
    if (!step) throw new Error(`Unknown Flow step: ${stepId}`);
    const previous = this.currentStepId;
    this.currentStepId = stepId;
    await this.emit({
      type: 'step_started',
      at: new Date().toISOString(),
      testCaseId: this.requireTestCaseId(),
      stepId,
    });
    try {
      const result = await action();
      await this.emit({
        type: 'step_completed',
        at: new Date().toISOString(),
        testCaseId: this.requireTestCaseId(),
        stepId,
      });
      return result;
    } finally {
      this.currentStepId = previous;
    }
  }

  /**
   * Resolve an explicit project data reference through the configured
   * RuntimeDataResolver.
   *
   * This keeps project data integration inside the runtime boundary and
   * avoids hardcoding data access logic inside generated Flow code.
   */
  async resolveData<T = unknown>(ref: string): Promise<T> {
    if (!ref || !ref.trim()) {
      throw new Error('resolveData() requires a non-empty data reference.');
    }

    if (!this.context.dataResolver) {
      await this.fail({
        phase: 'data',
        message: `No data resolver configured for ref "${ref}".`,
      });
      throw new Error(`No data resolver configured for ref "${ref}".`);
    }

    try {
      return await this.context.dataResolver.resolve<T>(ref, this.runContext);
    } catch (error) {
      await this.fail({
        phase: 'data',
        message: `Unable to resolve project data ref "${ref}".`,
        cause: error,
      });
      throw error;
    }
  }

  /**
   * Resolve the primary data.ref declared for the currently executing TC.
   *
   * Use resolveData(ref) directly when a TC intentionally uses multiple refs.
   */
  async resolveCurrentTestCaseData<T = unknown>(): Promise<T> {
    const testCaseId = this.requireTestCaseId();
    const testCase = this.context.flowMap.flow.test_cases.find(
      (item) => item.id === testCaseId,
    );

    if (!testCase) {
      throw new Error(`Unknown Flow test case: ${testCaseId}`);
    }

    const ref = testCase.data?.ref;

    if (!ref) {
      await this.fail({
        phase: 'data',
        message: `TC "${testCaseId}" does not define data.ref in the Flow Map.`,
      });
      throw new Error(
        `TC "${testCaseId}" does not define data.ref in the Flow Map.`,
      );
    }

    return await this.resolveData<T>(ref);
  }

  async interact(elementId: string, data?: unknown): Promise<void> {
    let target;
    try {
      target = await this.locatorResolver.resolve(elementId);
    } catch (error) {
      if (error instanceof LocatorResolutionError) {
        await this.fail({
          phase: 'locator_resolution',
          elementId,
          message: error.message,
          locatorAttempts: error.attempts,
          locatorResolved: false,
          interactionCompleted: false,
          cause: error,
        });
      }
      throw error;
    }

    if (target.recovered) {
      await this.emit({
        type: 'locator_recovery',
        at: new Date().toISOString(),
        testCaseId: this.context.run.testCaseId,
        stepId: this.currentStepId,
        elementId,
        recoveredWith: target.tier,
        attempts: target.attempts,
      });
    }

    const element = this.context.flowMap.flow.elements[elementId];
    const preferred = element.interaction.preferred;
    let resolvedData = data;
    if (resolvedData === undefined && preferred.data_ref) {
      if (!this.context.dataResolver) {
        await this.fail({
          phase: 'data',
          elementId,
          message: `No data resolver configured for ref "${preferred.data_ref}".`,
          locatorResolved: true,
          interactionCompleted: false,
        });
        throw new Error(`No data resolver configured for ref "${preferred.data_ref}".`);
      }
      resolvedData = await this.context.dataResolver.resolve(preferred.data_ref, this.runContext);
    }

    try {
      await this.interactionEngine.execute({
        locator: target.locator,
        elementId,
        definition: element.interaction,
        data: resolvedData,
        resolveElement: async (targetId) => this.locatorResolver.resolve(targetId),
      });
      await this.emit({
        type: 'interaction_completed',
        at: new Date().toISOString(),
        testCaseId: this.context.run.testCaseId,
        stepId: this.currentStepId,
        elementId,
        method: preferred.method,
      });
    } catch (error) {
      if (error instanceof InteractionExecutionError) {
        await this.fail({
          phase: 'interaction',
          elementId,
          message: error.message,
          locatorAttempts: target.attempts,
          locatorResolved: true,
          interactionCompleted: false,
          cause: error,
        });
      }
      throw error;
    }
  }

  async assert(assertionId: string): Promise<void> {
    try {
      await this.assertionEngine.execute(assertionId);
      await this.emit({
        type: 'assertion_completed',
        at: new Date().toISOString(),
        testCaseId: this.context.run.testCaseId,
        stepId: this.currentStepId,
        assertionId,
      });
    } catch (error) {
      if (error instanceof AssertionExecutionError) {
        await this.fail({
          phase: 'assertion',
          message: error.message,
          expected: error.expected,
          actual: error.actual,
          cause: error,
        });
      }
      throw error;
    }
  }

  async goto(url?: string): Promise<void> {
    const target = url ?? this.context.flowMap.flow.execution.start_url;
    if (!target) throw new Error('No navigation target provided and Flow Map has no start_url.');
    try {
      await this.context.page.goto(target);
    } catch (error) {
      await this.fail({
        phase: 'navigation',
        message: `Navigation failed for "${target}".`,
        cause: error,
      });
      throw error;
    }
  }

  async authenticate(userDataRef?: string): Promise<void> {
    const mode = this.context.flowMap.flow.execution.auth.mode;
    if (mode === 'none') return;
    if (mode === 'flow_scoped_shared') return;
    if (!this.context.authManager?.authenticateInline) {
      await this.fail({
        phase: 'authentication',
        message: 'Inline authentication requested but no auth manager is configured.',
      });
      throw new Error('Inline authentication requested but no auth manager is configured.');
    }
    await this.context.authManager.authenticateInline(
      this.context.page,
      this.context.flowMap,
      this.runContext,
      userDataRef ?? this.context.flowMap.flow.execution.auth.user_data_ref ?? undefined,
    );
  }

  private async fail(input: Omit<FlowFailureSignal, 'flowId' | 'testCaseId' | 'stepId'>): Promise<void> {
    const signal: FlowFailureSignal = {
      flowId: this.context.run.flowId,
      testCaseId: this.context.run.testCaseId,
      stepId: this.currentStepId,
      ...input,
    };
    await this.emit({ type: 'failure_signal', at: new Date().toISOString(), signal });
  }

  private async emit(signal: RuntimeSignal): Promise<void> {
    await this.context.signals.emit(signal);
  }

  private requireTestCaseId(): string {
    if (!this.context.run.testCaseId) throw new Error('FlowRuntime requires a testCaseId for step execution.');
    return this.context.run.testCaseId;
  }
}
