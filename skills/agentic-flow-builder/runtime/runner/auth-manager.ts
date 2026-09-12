import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { AuthError } from '../errors';
import type { FlowMap, RuntimeAuthManager, RuntimeRunContext } from '../types';

export interface ProjectAuthAdapter {
  login(page: Page, userDataRef: string | undefined, context: RuntimeRunContext): Promise<void>;
}

interface StorageStateLike {
  cookies?: unknown[];
  origins?: Array<{
    origin: string;
    localStorage?: Array<{ name: string; value: string }>;
  }>;
}

export class FlowScopedAuthManager implements RuntimeAuthManager {
  constructor(
    private readonly adapter: ProjectAuthAdapter,
    private readonly stateRoot: string,
  ) {}

  async prepareFlowScoped(browser: Browser, map: FlowMap, context: RuntimeRunContext): Promise<void> {
    if (map.flow.execution.auth.mode !== 'flow_scoped_shared') return;
    const path = this.statePath(context.runId);
    try {
      await readFile(path, 'utf8');
      return;
    } catch {
      // Create it below.
    }

    const browserContext = await browser.newContext();
    try {
      const page = await browserContext.newPage();
      await this.adapter.login(page, map.flow.execution.auth.user_data_ref ?? undefined, context);
      const state = await browserContext.storageState();
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(state, null, 2), { encoding: 'utf8', flag: 'wx' }).catch(async (error: unknown) => {
        const existing = await readFile(path, 'utf8').catch(() => null);
        if (existing === null) throw error;
      });
    } catch (error) {
      throw new AuthError('Unable to prepare flow-scoped authentication state.', { cause: error });
    } finally {
      await browserContext.close();
    }
  }

  async applyFlowScoped(browserContext: BrowserContext, page: Page, map: FlowMap, context: RuntimeRunContext): Promise<void> {
    if (map.flow.execution.auth.mode !== 'flow_scoped_shared') return;
    try {
      const state = JSON.parse(await readFile(this.statePath(context.runId), 'utf8')) as StorageStateLike;
      if (Array.isArray(state.cookies) && state.cookies.length > 0) {
        await browserContext.addCookies(state.cookies as never);
      }
      const origins = state.origins ?? [];
      if (origins.length > 0) {
        await page.addInitScript((items: StorageStateLike['origins']) => {
          const current = items?.find((item) => item.origin === window.location.origin);
          for (const entry of current?.localStorage ?? []) localStorage.setItem(entry.name, entry.value);
        }, origins);
      }
    } catch (error) {
      throw new AuthError('Unable to apply flow-scoped authentication state.', { cause: error });
    }
  }

  async authenticateInline(page: Page, map: FlowMap, context: RuntimeRunContext, userDataRef?: string): Promise<void> {
    if (map.flow.execution.auth.mode !== 'inline') return;
    try {
      await this.adapter.login(page, userDataRef ?? map.flow.execution.auth.user_data_ref ?? undefined, context);
    } catch (error) {
      throw new AuthError('Inline authentication failed.', { cause: error });
    }
  }

  async cleanup(_map: FlowMap, context: RuntimeRunContext): Promise<void> {
    await rm(this.statePath(context.runId), { force: true }).catch(() => undefined);
  }

  private statePath(runId: string): string {
    return join(this.stateRoot, `${runId}.storage-state.json`);
  }
}
