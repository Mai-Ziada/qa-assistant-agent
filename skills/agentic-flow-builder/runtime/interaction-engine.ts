import type { Locator } from '@playwright/test';
import { InteractionExecutionError } from './errors';
import type { InteractionDefinition, InteractionMethod } from './types';

export interface InteractionExecutionRequest {
  locator: Locator;
  elementId: string;
  definition: InteractionDefinition;
  data?: unknown;
  resolveElement?: (elementId: string) => Promise<{ locator: Locator }>;
}

export class InteractionEngine {
  async execute(request: InteractionExecutionRequest): Promise<void> {
    const interaction = request.definition.preferred;
    try {
      await this.executePreferred(request.locator, interaction, request.data, request.resolveElement);
    } catch (error) {
      throw new InteractionExecutionError({
        elementId: request.elementId,
        method: interaction.method,
        message: `Interaction "${interaction.method}" failed for element "${request.elementId}".`,
        cause: error,
      });
    }
  }

  private async executePreferred(
    locator: Locator,
    interaction: InteractionMethod,
    data?: unknown,
    resolveElement?: (elementId: string) => Promise<{ locator: Locator }>,
  ): Promise<void> {
    switch (interaction.method) {
      case 'click':
        await locator.click(this.safeClickOptions(interaction.options));
        return;
      case 'fill':
        await locator.fill(this.requireStringValue(data, interaction));
        return;
      case 'clear':
        await locator.clear();
        return;
      case 'check':
        await locator.check(this.safeTimeoutOptions(interaction.options));
        return;
      case 'uncheck':
        await locator.uncheck(this.safeTimeoutOptions(interaction.options));
        return;
      case 'selectOption':
        await locator.selectOption((data ?? interaction.value) as never);
        return;
      case 'setInputFiles': {
        const files = data ?? interaction.value;
        if (typeof files !== 'string' && !Array.isArray(files)) {
          throw new Error('setInputFiles requires a file path or array of file paths in V1.');
        }
        await locator.setInputFiles(files as string | string[]);
        return;
      }
      case 'press': {
        if (!interaction.key) throw new Error('press interaction requires key.');
        await locator.press(interaction.key);
        return;
      }
      case 'pressSequentially':
        await locator.pressSequentially(
          this.requireStringValue(data, interaction),
          this.safeSequentialOptions(interaction.options),
        );
        return;
      case 'hover':
        await locator.hover(this.safeTimeoutOptions(interaction.options));
        return;
      case 'dragTo': {
        if (!interaction.target_element) throw new Error('dragTo requires target_element.');
        if (!resolveElement) throw new Error('dragTo requires runtime element resolution capability.');
        const target = await resolveElement(interaction.target_element);
        await locator.dragTo(target.locator);
        return;
      }
      default: {
        const exhaustive: never = interaction.method;
        throw new Error(`Unsupported interaction method: ${exhaustive}`);
      }
    }
  }

  private requireStringValue(data: unknown, interaction: InteractionMethod): string {
    const value = data ?? interaction.value;
    if (typeof value !== 'string') {
      throw new Error(`Interaction "${interaction.method}" requires a string value.`);
    }
    return value;
  }

  private safeClickOptions(options?: Record<string, unknown>): {
    timeout?: number;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  } {
    if (!options) return {};
    this.rejectForce(options);
    const safe: { timeout?: number; button?: 'left' | 'right' | 'middle'; clickCount?: number } = {};
    if (typeof options.timeout === 'number') safe.timeout = options.timeout;
    if (options.button === 'left' || options.button === 'right' || options.button === 'middle') {
      safe.button = options.button;
    }
    if (typeof options.clickCount === 'number') safe.clickCount = options.clickCount;
    return safe;
  }

  private safeTimeoutOptions(options?: Record<string, unknown>): { timeout?: number } {
    if (!options) return {};
    this.rejectForce(options);
    return typeof options.timeout === 'number' ? { timeout: options.timeout } : {};
  }

  private rejectForce(options: Record<string, unknown>): void {
    if (options.force === true) {
      throw new Error('force: true is prohibited by agentic-flow-builder interaction policy.');
    }
  }

  private safeSequentialOptions(options?: Record<string, unknown>): { delay?: number } {
    if (!options) return {};
    const safe: { delay?: number } = {};
    if (typeof options.delay === 'number' && options.delay >= 0) safe.delay = options.delay;
    return safe;
  }
}
