import { DataResolutionError } from '../errors';
import type { RuntimeDataResolver, RuntimeRunContext } from '../types';

export type ProjectDataLookup = <T = unknown>(ref: string, context: RuntimeRunContext) => Promise<T> | T;
export type RunScopedDataTransform = <T = unknown>(value: T, ref: string, context: RuntimeRunContext) => Promise<T> | T;

export class CallbackDataResolver implements RuntimeDataResolver {
  constructor(
    private readonly lookup: ProjectDataLookup,
    private readonly runScopedTransform?: RunScopedDataTransform,
  ) {}

  async resolve<T = unknown>(ref: string, context: RuntimeRunContext): Promise<T> {
    try {
      const value = await this.lookup<T>(ref, context);
      if (value === undefined) throw new Error(`Data reference "${ref}" resolved to undefined.`);
      if (!this.runScopedTransform) return value;
      return await this.runScopedTransform<T>(value, ref, context);
    } catch (error) {
      throw new DataResolutionError(`Unable to resolve project data ref "${ref}".`, { cause: error });
    }
  }
}

export class ObjectPathDataResolver implements RuntimeDataResolver {
  constructor(private readonly source: Record<string, unknown>) {}

  async resolve<T = unknown>(ref: string): Promise<T> {
    const parts = ref.split('.').filter(Boolean);
    let current: unknown = this.source;
    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        throw new DataResolutionError(`Unknown data reference "${ref}".`);
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current as T;
  }
}
