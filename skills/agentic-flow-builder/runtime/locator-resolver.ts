import type { Locator, Page } from '@playwright/test';
import { LocatorResolutionError, TargetContractError } from './errors';
import type {
  ExecutionMode,
  FlowElement,
  FlowMap,
  LocatorAttemptRecord,
  LocatorDescriptor,
  LocatorStrategy,
  LocatorTier,
  ResolvedTarget,
  TargetContract,
} from './types';

export interface LocatorResolverOptions {
  resolutionTimeoutMs?: number;
}

interface ContractValidationResult {
  valid: boolean;
  reason?: string;
}

export class LocatorResolver {
  private readonly resolutionTimeoutMs: number;

  constructor(
    private readonly page: Page,
    private readonly flowMap: FlowMap,
    private readonly executionMode: ExecutionMode,
    options: LocatorResolverOptions = {},
  ) {
    this.resolutionTimeoutMs = options.resolutionTimeoutMs ?? 10_000;
  }

  async resolve(elementId: string): Promise<ResolvedTarget> {
    const element = this.flowMap.flow.elements[elementId];
    if (!element) {
      throw new LocatorResolutionError({
        elementId,
        message: `Unknown Flow element: ${elementId}`,
        attempts: [],
      });
    }

    const attempts: LocatorAttemptRecord[] = [];
    for (const tier of this.getAllowedTiers(this.executionMode)) {
      const result = await this.tryResolve(element, tier, element.locators[tier]);
      attempts.push(result.record);

      if (result.locator) {
        return {
          elementId,
          locator: result.locator,
          tier,
          strategy: element.locators[tier].strategy,
          attempts,
          recovered: this.executionMode === 'normal' && tier !== 'primary',
        };
      }

      if (this.executionMode !== 'normal') break;
    }

    throw new LocatorResolutionError({
      elementId,
      message: `Unable to resolve target "${elementId}" using mode "${this.executionMode}".`,
      attempts,
    });
  }

  buildStandaloneLocator(strategy: LocatorStrategy, value: Record<string, unknown>): Locator {
    return this.buildLocator({
      strategy,
      value,
      quality: 'medium',
      validation_status: 'pending',
    });
  }

  private getAllowedTiers(mode: ExecutionMode): LocatorTier[] {
    switch (mode) {
      case 'primary_only':
        return ['primary'];
      case 'fallback_only':
        return ['fallback'];
      case 'last_resort_only':
        return ['last_resort'];
      case 'normal':
        return ['primary', 'fallback', 'last_resort'];
      default: {
        const exhaustive: never = mode;
        throw new Error(`Unsupported execution mode: ${exhaustive}`);
      }
    }
  }

  private async tryResolve(
    element: FlowElement,
    tier: LocatorTier,
    descriptor: LocatorDescriptor,
  ): Promise<{ locator?: Locator; record: LocatorAttemptRecord }> {
    let locator: Locator;
    try {
      locator = this.buildLocator(descriptor);
    } catch (error) {
      return {
        record: {
          tier,
          strategy: descriptor.strategy,
          result: 'failed',
          reason: 'invalid_locator_definition',
          target_contract_valid: null,
          match_count: null,
          error: this.serializeError(error),
        },
      };
    }

    try {
      await locator.first().waitFor({ state: 'attached', timeout: this.resolutionTimeoutMs });
    } catch (error) {
      return {
        record: {
          tier,
          strategy: descriptor.strategy,
          result: 'failed',
          reason: 'no_matching_element',
          target_contract_valid: null,
          match_count: 0,
          error: this.serializeError(error),
        },
      };
    }

    const count = await locator.count();
    if (count === 0) {
      return {
        record: {
          tier,
          strategy: descriptor.strategy,
          result: 'failed',
          reason: 'no_matching_element',
          target_contract_valid: null,
          match_count: 0,
        },
      };
    }

    if (element.target_contract.unique !== false && count !== 1) {
      return {
        record: {
          tier,
          strategy: descriptor.strategy,
          result: 'failed',
          reason: 'ambiguous_target',
          target_contract_valid: false,
          match_count: count,
        },
      };
    }

    const candidate = locator.first();
    const contract = await this.validateTargetContract(candidate, element.target_contract);
    if (!contract.valid) {
      return {
        record: {
          tier,
          strategy: descriptor.strategy,
          result: 'failed',
          reason: contract.reason ?? 'target_contract_mismatch',
          target_contract_valid: false,
          match_count: count,
        },
      };
    }

    return {
      locator: candidate,
      record: {
        tier,
        strategy: descriptor.strategy,
        result: 'passed',
        target_contract_valid: true,
        match_count: count,
      },
    };
  }

  private buildLocator(descriptor: LocatorDescriptor): Locator {
    return this.buildFromRoot(this.page, descriptor.strategy, descriptor.value);
  }

  private buildFromRoot(root: Page | Locator, strategy: LocatorStrategy, value: Record<string, unknown>): Locator {
    switch (strategy) {
      case 'test_id':
        return root.getByTestId(this.requireString(value, 'test_id', strategy));

      case 'role': {
        const role = this.requireString(value, 'role', strategy);
        const name = this.optionalTextMatcher(value.name);
        const exact = typeof value.exact === 'boolean' ? value.exact : undefined;
        return root.getByRole(role as never, {
          ...(name !== undefined ? { name } : {}),
          ...(exact !== undefined ? { exact } : {}),
        });
      }

      case 'label':
        return root.getByLabel(this.requireTextMatcher(value, 'label', strategy), {
          exact: typeof value.exact === 'boolean' ? value.exact : false,
        });

      case 'placeholder':
        return root.getByPlaceholder(this.requireTextMatcher(value, 'placeholder', strategy), {
          exact: typeof value.exact === 'boolean' ? value.exact : false,
        });

      case 'text':
        return root.getByText(this.requireTextMatcher(value, 'text', strategy), {
          exact: typeof value.exact === 'boolean' ? value.exact : false,
        });

      case 'alt_text':
        return root.getByAltText(this.requireTextMatcher(value, 'text', strategy), {
          exact: typeof value.exact === 'boolean' ? value.exact : false,
        });

      case 'attribute': {
        const name = this.requireString(value, 'name', strategy);
        const attributeValue = this.requireString(value, 'value', strategy);
        if (!/^[A-Za-z_:][-A-Za-z0-9_:.]*$/.test(name)) {
          throw new TargetContractError(`Unsafe attribute name: ${name}`);
        }
        const escaped = attributeValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return root.locator(`[${name}="${escaped}"]`);
      }

      case 'css':
        return root.locator(this.requireString(value, 'selector', strategy));

      case 'xpath': {
        const selector = this.requireString(value, 'selector', strategy);
        return root.locator(selector.startsWith('xpath=') ? selector : `xpath=${selector}`);
      }

      case 'scoped': {
        const scope = this.requireNestedLocator(value.scope, 'scope');
        const target = this.requireNestedLocator(value.target, 'target');
        const scoped = this.buildFromRoot(root, scope.strategy, scope.value);
        return this.buildFromRoot(scoped, target.strategy, target.value);
      }

      case 'nth': {
        const base = this.requireNestedLocator(value.base, 'base');
        const index = value.index;
        if (typeof index !== 'number' || !Number.isInteger(index)) {
          throw new TargetContractError('nth locator requires an integer index.');
        }
        return this.buildFromRoot(root, base.strategy, base.value).nth(index);
      }

      default: {
        const exhaustive: never = strategy;
        throw new Error(`Unsupported locator strategy: ${exhaustive}`);
      }
    }
  }

  private async validateTargetContract(locator: Locator, contract: TargetContract): Promise<ContractValidationResult> {
    if (contract.tag) {
      const tag = await locator.evaluate((element) => element.tagName.toLowerCase());
      if (tag !== contract.tag.toLowerCase()) {
        return { valid: false, reason: `Expected tag "${contract.tag}" but resolved "${tag}".` };
      }
    }

    if (contract.input_type) {
      const actualType = (await locator.getAttribute('type'))?.toLowerCase() ?? null;
      if (actualType !== contract.input_type.toLowerCase()) {
        return { valid: false, reason: `Expected input type "${contract.input_type}" but resolved "${actualType}".` };
      }
    }

    if (contract.editable !== undefined) {
      const editable = await locator.isEditable().catch(() => false);
      if (editable !== contract.editable) {
        return { valid: false, reason: `Expected editable=${contract.editable} but resolved editable=${editable}.` };
      }
    }

    if (contract.expected_text) {
      const text = (await locator.textContent())?.trim() ?? '';
      if (!text.includes(contract.expected_text)) {
        return { valid: false, reason: `Resolved target does not contain expected text "${contract.expected_text}".` };
      }
    }

    if (contract.role) {
      const explicitRole = await locator.getAttribute('role');
      const tag = await locator.evaluate((element) => element.tagName.toLowerCase());
      const type = (await locator.getAttribute('type'))?.toLowerCase() ?? null;
      const inferredRole = explicitRole ?? this.inferRole(tag, type, await locator.getAttribute('href'));
      if (inferredRole && inferredRole !== contract.role) {
        return { valid: false, reason: `Expected role "${contract.role}" but resolved "${inferredRole}".` };
      }
    }

    if (contract.accessible_name) {
      const ariaLabel = await locator.getAttribute('aria-label');
      const title = await locator.getAttribute('title');
      const text = (await locator.textContent())?.trim() ?? '';
      const visibleCandidate = ariaLabel ?? title ?? text;
      if (visibleCandidate && visibleCandidate.trim() !== contract.accessible_name.trim()) {
        return { valid: false, reason: `Expected accessible name "${contract.accessible_name}" but resolved candidate "${visibleCandidate}".` };
      }
    }

    return { valid: true };
  }

  private inferRole(tag: string, type: string | null, href: string | null): string | null {
    if (tag === 'button') return 'button';
    if (tag === 'a' && href) return 'link';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (tag !== 'input') return null;
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
    if (type === 'search') return 'searchbox';
    return 'textbox';
  }

  private requireString(source: Record<string, unknown>, key: string, strategy: string): string {
    const value = source[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new TargetContractError(`Locator strategy "${strategy}" requires string field "${key}".`);
    }
    return value;
  }

  private requireTextMatcher(source: Record<string, unknown>, key: string, strategy: string): string | RegExp {
    const value = source[key];
    if (typeof value === 'string') return value;
    const regex = this.optionalTextMatcher(value);
    if (regex) return regex;
    throw new TargetContractError(`Locator strategy "${strategy}" requires text matcher field "${key}".`);
  }

  private optionalTextMatcher(value: unknown): string | RegExp | undefined {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as { regex?: unknown; flags?: unknown };
    if (typeof candidate.regex !== 'string') return undefined;
    return new RegExp(candidate.regex, typeof candidate.flags === 'string' ? candidate.flags : undefined);
  }

  private requireNestedLocator(value: unknown, key: string): { strategy: LocatorStrategy; value: Record<string, unknown> } {
    if (!value || typeof value !== 'object') {
      throw new TargetContractError(`Locator requires nested "${key}" definition.`);
    }
    const candidate = value as { strategy?: unknown; value?: unknown };
    if (typeof candidate.strategy !== 'string' || !candidate.value || typeof candidate.value !== 'object') {
      throw new TargetContractError(`Invalid nested locator definition in "${key}".`);
    }
    return {
      strategy: candidate.strategy as LocatorStrategy,
      value: candidate.value as Record<string, unknown>,
    };
  }

  private serializeError(error: unknown): { type: string; message: string } {
    if (error instanceof Error) return { type: error.name, message: error.message };
    return { type: 'UnknownError', message: String(error) };
  }
}
