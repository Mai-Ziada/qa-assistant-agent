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
        errors.trace =
          'Trace retention was requested by the Flow Map, but Playwright did not expose a trace attachment. Configure Playwright trace retention for failed tests.';
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
