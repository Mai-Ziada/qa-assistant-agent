import { copyFile, mkdir } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import type { EvidenceItem } from '../types';

export class EvidenceManager {
  constructor(
    private readonly root: string,
    private readonly referenceRoot: string,
  ) {}

  async captureFailure(input: {
    page: Page;
    testInfo: TestInfo;
    flowId: string;
    runId: string;
    testCaseId: string;
    shortName?: string;
    screenshot: boolean;
    trace: boolean;
  }): Promise<{ items: EvidenceItem[]; errors: Record<string, string> }> {
    const dir = join(this.root, 'agentic-flow-builder', input.flowId, input.runId);
    await mkdir(dir, { recursive: true });

    const items: EvidenceItem[] = [];
    const errors: Record<string, string> = {};
    const safeName = this.safeName(input.shortName ?? 'failure');

    if (input.screenshot) {
      const screenshotPath = join(
        dir,
        `${this.safeName(input.testCaseId)}-${safeName}.png`,
      );

      try {
        await input.page.screenshot({ path: screenshotPath, fullPage: true });
        items.push({
          type: 'screenshot',
          test_case: input.testCaseId,
          path: this.referencePath(screenshotPath),
          reason: 'test_failure',
        });
      } catch (error) {
        errors.screenshot = error instanceof Error ? error.message : String(error);
      }
    }

    if (input.trace) {
      const traceAttachment = input.testInfo.attachments.find(
        (attachment) =>
          Boolean(attachment.path) && attachment.name.toLowerCase().includes('trace'),
      );

      if (!traceAttachment?.path) {
        // Playwright writes the retained trace only after the worker has
        // finished with the test — later than this afterEach-time capture
        // (confirmed locally, 2026-09-30) — so it cannot be copied here.
        // Record where Playwright will write it instead. That path stays
        // valid because each Flow Run gets its own output folder (the
        // project's playwright.config.ts keys outputDir by AFB_RUN_ID).
        const mode = this.traceMode(input.testInfo);
        if (mode === 'off') {
          errors.trace =
            'Trace retention was requested by the Flow Map, but Playwright tracing is off. Set use.trace (e.g. retain-on-failure) in playwright.config.ts.';
        } else {
          items.push({
            type: 'trace',
            test_case: input.testCaseId,
            path: this.referencePath(join(input.testInfo.outputDir, 'trace.zip')),
            reason: 'test_failure',
            description: `Written by Playwright (trace: ${mode}) after the test ends; kept until this run's output folder is pruned.`,
          });
        }
      } else {
        const target = join(
          dir,
          basename(traceAttachment.path).endsWith('.zip')
            ? 'trace.zip'
            : basename(traceAttachment.path),
        );

        try {
          await copyFile(traceAttachment.path, target);
          items.push({
            type: 'trace',
            test_case: input.testCaseId,
            path: this.referencePath(target),
            reason: 'test_failure',
          });
        } catch (error) {
          errors.trace = error instanceof Error ? error.message : String(error);
        }
      }
    }

    return { items, errors };
  }

  private traceMode(testInfo: TestInfo): string {
    const trace = (testInfo.project.use as { trace?: unknown }).trace;
    if (typeof trace === 'string') return trace;
    if (trace && typeof trace === 'object' && typeof (trace as { mode?: unknown }).mode === 'string') {
      return (trace as { mode: string }).mode;
    }
    return 'off';
  }

  private referencePath(path: string): string {
    return relative(this.referenceRoot, path).replace(/\\/g, '/');
  }

  private safeName(value: string): string {
    return value
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }
}
