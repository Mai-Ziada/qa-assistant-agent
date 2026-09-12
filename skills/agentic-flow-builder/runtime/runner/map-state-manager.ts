import type { FlowMap, MapStatus, RunRecord, StatusTransition, VerificationRunReference } from '../types';

export interface MapStateUpdate {
  map: FlowMap;
  transition: StatusTransition;
}

export class MapStateManager {
  applyRun(map: FlowMap, runRecord: RunRecord): MapStateUpdate {
    const before = map.flow.metadata.status;
    const run = runRecord.run;

    if (run.type === 'verification' || run.type === 'revalidation') {
      this.updateVerificationReference(map, runRecord);
      this.updateLocatorValidationStatuses(map, runRecord);
    }

    // repair_validation is targeted evidence only. It must never satisfy
    // the official three-strategy verification proof for a revision.

    const after = this.calculateStatus(map, runRecord);
    map.flow.metadata.status = after;
    map.flow.metadata.updated_at = new Date().toISOString();

    if (after === 'verified') {
      map.flow.verification.verified_revision = map.flow.metadata.revision;
      map.flow.verification.revalidation_reason = null;
    }

    return {
      map,
      transition: {
        changed: before !== after,
        from: before,
        to: after,
        reason: this.transitionReason(before, after, runRecord),
      },
    };
  }

  markDefinitionChanged(map: FlowMap, reason: FlowMap['flow']['change_reason']): FlowMap {
    const previous = map.flow.metadata.revision;
    map.flow.metadata.revision = previous + 1;
    map.flow.verification.current_revision = previous + 1;
    map.flow.metadata.status = 'revalidation_required';
    map.flow.metadata.updated_at = new Date().toISOString();
    map.flow.change_reason = reason ?? {
      type: 'automation_definition_changed',
      previous_revision: previous,
    };
    map.flow.verification.revalidation_reason = {
      type: reason?.type ?? 'automation_definition_changed',
      element: reason?.affected_element,
      detected_at: new Date().toISOString(),
    };
    map.flow.verification.latest_runs = {
      primary: null,
      fallback: null,
      last_resort: null,
    };
    return map;
  }

  private calculateStatus(map: FlowMap, runRecord: RunRecord): MapStatus {
    const run = runRecord.run;
    const current = map.flow.metadata.status;

    if (run.type === 'normal') {
      if (run.locator_execution.failures.length > 0 && run.failures.some((failure) => failure.automation.repair_required)) {
        return 'broken';
      }
      if (run.locator_execution.recoveries.some((recovery) => recovery.recovered_with === 'last_resort')) {
        return 'degraded_critical';
      }
      if (run.locator_execution.recoveries.some((recovery) => recovery.recovered_with === 'fallback')) {
        return current === 'degraded_critical' ? current : 'degraded';
      }
      return current;
    }

    if (run.type === 'repair_validation') {
      return current === 'revalidation_required' ? current : current;
    }

    if (current === 'revalidation_required') {
      return this.allRequiredStrategiesPassedForCurrentRevision(map) ? 'verified' : 'revalidation_required';
    }

    if (run.result !== 'passed') return current;

    if (current === 'drafted' && run.execution_mode === 'primary_only') return 'primary_validated';
    if (current === 'primary_validated' && run.execution_mode === 'fallback_only') return 'fallback_validated';
    if (current === 'fallback_validated' && run.execution_mode === 'last_resort_only') return 'verified';

    return current;
  }

  private updateLocatorValidationStatuses(map: FlowMap, runRecord: RunRecord): void {
    const mode = runRecord.run.execution_mode;
    const tier =
      mode === 'primary_only'
        ? 'primary'
        : mode === 'fallback_only'
          ? 'fallback'
          : mode === 'last_resort_only'
            ? 'last_resort'
            : null;

    if (!tier) return;

    /**
     * Explicit locator failures are trustworthy negative evidence.
     * Mark only the elements that actually failed resolution.
     */
    for (const failure of runRecord.run.locator_execution.failures) {
      const element = map.flow.elements[failure.element];
      if (element) element.locators[tier].validation_status = 'failed';
    }

    /**
     * A fully passed strategy verification proves the locator tier for the
     * elements covered by the selected TCs. Happy-path locator usage is
     * intentionally implicit in Run YAML, so coverage is derived from the
     * selected TC step definitions and element.used_in metadata.
     */
    if (runRecord.run.result !== 'passed') return;

    const coveredSteps = this.coveredStepIds(map, runRecord);

    for (const element of Object.values(map.flow.elements)) {
      if (element.used_in.some((stepId) => coveredSteps.has(stepId))) {
        element.locators[tier].validation_status = 'validated';
      }
    }
  }

  private coveredStepIds(map: FlowMap, runRecord: RunRecord): Set<string> {
    const selected = new Set(runRecord.run.selection.test_cases);
    const orderedSteps = map.flow.steps.map((step) => step.id);
    const result = new Set<string>();

    for (const testCase of map.flow.test_cases) {
      if (!selected.has(testCase.id)) continue;

      if (Array.isArray(testCase.steps)) {
        for (const stepId of testCase.steps) result.add(stepId);
        continue;
      }

      const fromIndex = orderedSteps.indexOf(testCase.steps.from);
      const toIndex = orderedSteps.indexOf(testCase.steps.to);

      if (fromIndex === -1 || toIndex === -1) continue;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      for (let index = start; index <= end; index += 1) {
        result.add(orderedSteps[index]);
      }
    }

    return result;
  }

  private updateVerificationReference(map: FlowMap, runRecord: RunRecord): void {
    const run = runRecord.run;
    const ref: VerificationRunReference = {
      run_id: run.id,
      result: run.result,
      map_revision: run.map_revision,
    };

    if (run.execution_mode === 'primary_only') map.flow.verification.latest_runs.primary = ref;
    if (run.execution_mode === 'fallback_only') map.flow.verification.latest_runs.fallback = ref;
    if (run.execution_mode === 'last_resort_only') map.flow.verification.latest_runs.last_resort = ref;
  }

  private allRequiredStrategiesPassedForCurrentRevision(map: FlowMap): boolean {
    const revision = map.flow.metadata.revision;
    const latest = map.flow.verification.latest_runs;
    const required = map.flow.verification.required_strategies;

    const passed = (ref: VerificationRunReference | null): boolean =>
      Boolean(ref && ref.result === 'passed' && ref.map_revision === revision);

    return (
      (!required.primary.required || passed(latest.primary)) &&
      (!required.fallback.required || passed(latest.fallback)) &&
      (!required.last_resort.required || passed(latest.last_resort))
    );
  }

  private transitionReason(before: MapStatus, after: MapStatus, runRecord: RunRecord): string | null {
    if (before === after) return null;
    const run = runRecord.run;
    if (after === 'primary_validated') return 'primary_verification_passed';
    if (after === 'fallback_validated') return 'fallback_verification_passed';
    if (after === 'verified') return 'required_verification_passed';
    if (after === 'degraded_critical') return 'last_resort_locator_required';
    if (after === 'degraded') return 'primary_locator_failed_fallback_recovered';
    if (after === 'broken') return 'confirmed_automation_failure';
    return `${before}_to_${after}_${run.type}`;
  }
}
