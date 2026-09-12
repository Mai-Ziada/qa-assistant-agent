import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';
import { MapValidationError } from '../errors';
import type { FlowMap, LocatorTier } from '../types';

const LOCATOR_TIERS: LocatorTier[] = ['primary', 'fallback', 'last_resort'];
const MAP_STATUSES = new Set([
  'drafted', 'primary_validated', 'fallback_validated', 'verified',
  'degraded', 'degraded_critical', 'broken', 'revalidation_required',
]);
const AUTH_MODES = new Set(['inline', 'flow_scoped_shared', 'none']);
const LOCATOR_STRATEGIES = new Set([
  'test_id', 'role', 'label', 'scoped', 'placeholder', 'text', 'alt_text',
  'attribute', 'css', 'xpath', 'nth',
]);
const LOCATOR_QUALITIES = new Set(['high', 'medium', 'low', 'brittle']);
const LOCATOR_VALIDATION_STATUSES = new Set(['pending', 'validated', 'failed']);
const INTERACTION_METHODS = new Set([
  'click', 'fill', 'clear', 'check', 'uncheck', 'selectOption', 'setInputFiles',
  'press', 'pressSequentially', 'hover', 'dragTo',
]);
const ASSERTION_TYPES = new Set([
  'visible', 'hidden', 'enabled', 'disabled', 'text', 'value', 'checked',
  'count', 'url', 'business_state',
]);
const RUN_RESULTS = new Set([
  'passed', 'passed_with_recovery', 'partial_failed', 'partial_blocked', 'failed', 'blocked',
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

export class MapStore {
  constructor(private readonly mapPath: string) {}

  async read(): Promise<FlowMap> {
    const raw = await readFile(this.mapPath, 'utf8');
    const map = parse(raw) as FlowMap;
    this.validate(map);
    return map;
  }

  async write(map: FlowMap): Promise<void> {
    this.validate(map);
    const temp = join(dirname(this.mapPath), `.map-${process.pid}-${Date.now()}.tmp`);
    await writeFile(temp, stringify(map, { indent: 2 }), 'utf8');
    await rename(temp, this.mapPath);
  }

  validate(map: FlowMap): void {
    if (!map?.flow?.metadata?.id) {
      throw new MapValidationError('Flow Map is missing flow.metadata.id.');
    }
    if (!Array.isArray(map.flow.steps) || map.flow.steps.length === 0) {
      throw new MapValidationError('Flow Map must define flow.steps.');
    }
    if (!Array.isArray(map.flow.test_cases) || map.flow.test_cases.length === 0) {
      throw new MapValidationError('Flow Map must define test_cases.');
    }
    if (!map.flow.elements || typeof map.flow.elements !== 'object') {
      throw new MapValidationError('Flow Map must define flow.elements.');
    }
    if (!map.flow.assertions || typeof map.flow.assertions !== 'object') {
      throw new MapValidationError('Flow Map must define flow.assertions.');
    }

    if (!MAP_STATUSES.has(map.flow.metadata.status)) {
      throw new MapValidationError(`Unsupported Map status: ${String(map.flow.metadata.status)}`);
    }
    if (!Number.isInteger(map.flow.metadata.revision) || map.flow.metadata.revision < 1) {
      throw new MapValidationError('metadata.revision must be an integer >= 1.');
    }
    if (!AUTH_MODES.has(map.flow.execution.auth.mode)) {
      throw new MapValidationError(`Unsupported auth mode: ${String(map.flow.execution.auth.mode)}`);
    }

    if (map.flow.metadata.revision !== map.flow.verification.current_revision) {
      throw new MapValidationError(
        'metadata.revision must equal verification.current_revision.',
      );
    }
    if (map.flow.execution.auth.isolation.cross_flow_session_reuse !== false) {
      throw new MapValidationError('cross_flow_session_reuse must remain false.');
    }

    const stepIds = map.flow.steps.map((step) => step.id);
    const tcIds = map.flow.test_cases.map((tc) => tc.id);
    this.assertUnique(stepIds, 'Flow step IDs');
    this.assertUnique(tcIds, 'Flow test-case IDs');

    const stepIdSet = new Set(stepIds);
    const tcIdSet = new Set(tcIds);

    for (const tc of map.flow.test_cases) {
      if (Array.isArray(tc.steps)) {
        for (const stepId of tc.steps) {
          if (!stepIdSet.has(stepId)) {
            throw new MapValidationError(
              `TC "${tc.id}" references unknown step "${stepId}".`,
            );
          }
        }
      } else {
        if (!stepIdSet.has(tc.steps.from) || !stepIdSet.has(tc.steps.to)) {
          throw new MapValidationError(
            `TC "${tc.id}" contains an unknown step range.`,
          );
        }
      }

      for (const dependency of tc.depends_on ?? []) {
        if (!tcIdSet.has(dependency)) {
          throw new MapValidationError(
            `TC "${tc.id}" depends on unknown TC "${dependency}".`,
          );
        }
        if (dependency === tc.id) {
          throw new MapValidationError(`TC "${tc.id}" cannot depend on itself.`);
        }
      }
    }

    for (const [elementId, element] of Object.entries(map.flow.elements)) {
      for (const stepId of element.used_in) {
        if (!stepIdSet.has(stepId)) {
          throw new MapValidationError(
            `Element "${elementId}" references unknown step "${stepId}".`,
          );
        }
      }

      for (const tier of LOCATOR_TIERS) {
        const locator = element.locators?.[tier];
        if (!locator) {
          throw new MapValidationError(
            `Element "${elementId}" is missing ${tier} locator.`,
          );
        }
        if (!locator.strategy || !locator.value || typeof locator.value !== 'object') {
          throw new MapValidationError(
            `Element "${elementId}" has an invalid ${tier} locator definition.`,
          );
        }
        if (!LOCATOR_STRATEGIES.has(locator.strategy)) {
          throw new MapValidationError(
            `Element "${elementId}" has unsupported ${tier} locator strategy "${String(locator.strategy)}".`,
          );
        }
        if (!LOCATOR_QUALITIES.has(locator.quality)) {
          throw new MapValidationError(
            `Element "${elementId}" has invalid ${tier} locator quality.`,
          );
        }
        if (!LOCATOR_VALIDATION_STATUSES.has(locator.validation_status)) {
          throw new MapValidationError(
            `Element "${elementId}" has invalid ${tier} validation_status.`,
          );
        }
      }

      if (!element.target_contract || Object.keys(element.target_contract).length === 0) {
        throw new MapValidationError(`Element "${elementId}" must define a non-empty target_contract.`);
      }
      if (!INTERACTION_METHODS.has(element.interaction?.preferred?.method)) {
        throw new MapValidationError(
          `Element "${elementId}" has unsupported preferred interaction method.`,
        );
      }
      for (const alternative of element.interaction?.alternatives ?? []) {
        if (!INTERACTION_METHODS.has(alternative.method) || alternative.automatic_fallback !== false) {
          throw new MapValidationError(
            `Element "${elementId}" has an invalid interaction alternative. Alternatives must be explicit and automatic_fallback=false.`,
          );
        }
      }

      const targetElement = element.interaction?.preferred?.target_element;
      if (targetElement && !map.flow.elements[targetElement]) {
        throw new MapValidationError(
          `Element "${elementId}" interaction references unknown target element "${targetElement}".`,
        );
      }

      for (const assertionId of element.expected_state?.after_action?.assertions ?? []) {
        if (!map.flow.assertions[assertionId]) {
          throw new MapValidationError(
            `Element "${elementId}" references unknown assertion "${assertionId}".`,
          );
        }
      }
    }

    for (const [assertionId, assertion] of Object.entries(map.flow.assertions)) {
      if (!ASSERTION_TYPES.has(assertion.type)) {
        throw new MapValidationError(
          `Assertion "${assertionId}" has unsupported type "${String(assertion.type)}".`,
        );
      }
      if (assertion.after_step && !stepIdSet.has(assertion.after_step)) {
        throw new MapValidationError(
          `Assertion "${assertionId}" references unknown step "${assertion.after_step}".`,
        );
      }

      const targetCount = Number(Boolean(assertion.target.element)) + Number(Boolean(assertion.target.locator));
      if (targetCount !== 1) {
        throw new MapValidationError(
          `Assertion "${assertionId}" must define exactly one target: element or locator.`,
        );
      }

      if (assertion.target.element && !map.flow.elements[assertion.target.element]) {
        throw new MapValidationError(
          `Assertion "${assertionId}" references unknown element "${assertion.target.element}".`,
        );
      }
    }

    for (const [tier, ref] of Object.entries(map.flow.verification.latest_runs)) {
      if (!ref) continue;
      if (!ref.run_id || !RUN_RESULTS.has(ref.result)) {
        throw new MapValidationError(`verification.latest_runs.${tier} is invalid.`);
      }
      if (ref.map_revision !== undefined && (!Number.isInteger(ref.map_revision) || ref.map_revision < 1)) {
        throw new MapValidationError(`verification.latest_runs.${tier}.map_revision must be an integer >= 1.`);
      }
    }

    if (map.flow.metadata.status === 'verified') {
      if (map.flow.verification.verified_revision !== map.flow.metadata.revision) {
        throw new MapValidationError(
          'verified Map requires verified_revision == current revision.',
        );
      }
      this.assertVerifiedStrategyProofs(map);
    }

    if (
      map.flow.metadata.status === 'revalidation_required' &&
      map.flow.verification.verified_revision === map.flow.metadata.revision &&
      !map.flow.verification.revalidation_reason
    ) {
      throw new MapValidationError(
        'revalidation_required needs an older verified revision or an explicit revalidation reason.',
      );
    }

    this.assertNoSensitiveKeys(map);
  }

  private assertVerifiedStrategyProofs(map: FlowMap): void {
    const revision = map.flow.metadata.revision;
    const required = map.flow.verification.required_strategies;
    const latest = map.flow.verification.latest_runs;

    const passed = (ref: typeof latest.primary): boolean =>
      Boolean(ref && ref.result === 'passed' && ref.map_revision === revision);

    if (required.primary.required && !passed(latest.primary)) {
      throw new MapValidationError('verified Map is missing current-revision Primary verification proof.');
    }
    if (required.fallback.required && !passed(latest.fallback)) {
      throw new MapValidationError('verified Map is missing current-revision Fallback verification proof.');
    }
    if (required.last_resort.required && !passed(latest.last_resort)) {
      throw new MapValidationError('verified Map is missing current-revision Last Resort verification proof.');
    }
  }

  private assertUnique(values: string[], label: string): void {
    if (new Set(values).size !== values.length) {
      throw new MapValidationError(`${label} must be unique.`);
    }
  }

  private assertNoSensitiveKeys(value: unknown, path = 'flow'): void {
    if (Array.isArray(value)) {
      value.forEach((item, index) => this.assertNoSensitiveKeys(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        throw new MapValidationError(
          `Sensitive field "${path}.${key}" must not be stored in the Flow Map. Use a project data/config reference instead.`,
        );
      }
      this.assertNoSensitiveKeys(nested, `${path}.${key}`);
    }
  }
}
