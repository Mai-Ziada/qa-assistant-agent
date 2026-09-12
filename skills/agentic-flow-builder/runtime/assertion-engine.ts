import { expect, type Locator, type Page } from '@playwright/test';
import { AssertionExecutionError } from './errors';
import { LocatorResolver } from './locator-resolver';
import type { AssertionDefinition, FlowMap } from './types';

export class AssertionEngine {
  constructor(
    private readonly page: Page,
    private readonly flowMap: FlowMap,
    private readonly locatorResolver: LocatorResolver,
  ) {}

  async execute(assertionId: string): Promise<void> {
    const definition = this.flowMap.flow.assertions[assertionId];
    if (!definition) {
      throw new AssertionExecutionError({
        assertionId,
        message: `Unknown assertion: ${assertionId}`,
      });
    }

    try {
      await this.executeDefinition(definition);
    } catch (error) {
      const actual = await this.readActual(definition).catch(() => undefined);
      throw new AssertionExecutionError({
        assertionId,
        message: `Assertion "${assertionId}" failed.`,
        expected: definition.expected,
        actual,
        cause: error,
      });
    }
  }

  private async executeDefinition(definition: AssertionDefinition): Promise<void> {
    if (definition.type === 'url') {
      await expect(this.page).toHaveURL(this.toTextMatcher(definition.expected));
      return;
    }

    const locator = await this.resolveTarget(definition);
    switch (definition.type) {
      case 'visible':
        await expect(locator).toBeVisible();
        return;
      case 'hidden':
        await expect(locator).toBeHidden();
        return;
      case 'enabled':
        await expect(locator).toBeEnabled();
        return;
      case 'disabled':
        await expect(locator).toBeDisabled();
        return;
      case 'text':
      case 'business_state':
        await expect(locator).toHaveText(this.toTextMatcher(definition.expected));
        return;
      case 'value':
        await expect(locator).toHaveValue(this.toTextMatcher(definition.expected));
        return;
      case 'checked':
        await expect(locator).toBeChecked({ checked: Boolean(definition.expected) });
        return;
      case 'count': {
        if (typeof definition.expected !== 'number') throw new Error('count assertion requires numeric expected value.');
        await expect(locator).toHaveCount(definition.expected);
        return;
      }
      default: {
        const exhaustive: never = definition.type;
        throw new Error(`Unsupported assertion type: ${exhaustive}`);
      }
    }
  }

  private async resolveTarget(definition: AssertionDefinition): Promise<Locator> {
    if (definition.target.element) {
      return (await this.locatorResolver.resolve(definition.target.element)).locator;
    }
    if (definition.target.locator) {
      return this.locatorResolver.buildStandaloneLocator(
        definition.target.locator.strategy,
        definition.target.locator.value,
      );
    }
    throw new Error('Assertion target must define element or locator.');
  }

  private toTextMatcher(value: unknown): string | RegExp {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const candidate = value as { regex?: unknown; flags?: unknown };
      if (typeof candidate.regex === 'string') {
        return new RegExp(candidate.regex, typeof candidate.flags === 'string' ? candidate.flags : undefined);
      }
    }
    return String(value);
  }

  private async readActual(definition: AssertionDefinition): Promise<unknown> {
    if (definition.type === 'url') return this.page.url();
    const locator = await this.resolveTarget(definition);
    switch (definition.type) {
      case 'visible': return locator.isVisible();
      case 'hidden': return !(await locator.isVisible());
      case 'enabled': return locator.isEnabled();
      case 'disabled': return !(await locator.isEnabled());
      case 'text':
      case 'business_state': return locator.textContent();
      case 'value': return locator.inputValue();
      case 'checked': return locator.isChecked();
      case 'count': return locator.count();
      default: return undefined;
    }
  }
}
