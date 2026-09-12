import type { FailureClassification, FailureRecord, FlowFailureSignal } from '../types';

export class DiagnosisEngine {
  toFailureRecord(signal: FlowFailureSignal, index: number): FailureRecord {
    const classification = this.classify(signal);
    const automationOwned = signal.metadata?.automationOwned === true;
    const repairRequired =
      classification === 'locator_failure' ||
      classification === 'automation_code_failure' ||
      (automationOwned && ['interaction_failure', 'assertion_failure', 'navigation_failure'].includes(classification));

    return {
      id: `FAIL-${String(index + 1).padStart(3, '0')}`,
      test_case: signal.testCaseId ?? 'UNKNOWN-TC',
      step: signal.stepId ?? 'UNKNOWN-STEP',
      element: signal.elementId ?? null,
      classification,
      summary: signal.message,
      phase: signal.phase,
      automation: {
        locator_resolved: signal.locatorResolved ?? null,
        interaction_completed: signal.interactionCompleted ?? null,
        repair_required: repairRequired,
      },
      expected: signal.expected,
      actual: signal.actual,
      locator_attempts: signal.locatorAttempts,
      application_observation:
        signal.metadata?.applicationObservation && typeof signal.metadata.applicationObservation === 'object'
          ? (signal.metadata.applicationObservation as Record<string, unknown>)
          : null,
    };
  }

  classify(signal: FlowFailureSignal): FailureClassification {
    const hint = signal.metadata?.classificationHint;
    if (typeof hint === 'string' && this.isClassification(hint)) return hint;
    if (signal.metadata?.applicationEvidence === true) return 'application_failure';

    switch (signal.phase) {
      case 'locator_resolution': return 'locator_failure';
      case 'interaction': return 'interaction_failure';
      case 'assertion': return 'assertion_failure';
      case 'data': return 'data_failure';
      case 'authentication': return 'auth_failure';
      case 'navigation': return 'navigation_failure';
      case 'runtime': return 'automation_code_failure';
      case 'unknown': return 'unknown';
      default: return 'unknown';
    }
  }

  private isClassification(value: string): value is FailureClassification {
    return [
      'application_failure', 'locator_failure', 'interaction_failure', 'assertion_failure',
      'data_failure', 'auth_failure', 'environment_failure', 'navigation_failure',
      'automation_code_failure', 'unknown',
    ].includes(value);
  }
}
