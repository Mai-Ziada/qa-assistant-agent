import { readdir, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

/**
 * Keeps Playwright's per-run output folders (and the traces inside them)
 * from growing without bound.
 *
 * Playwright empties its outputDir at the start of every run, which would
 * destroy the trace a previous failed Run's evidence points to. The project's
 * playwright.config.ts therefore sets outputDir to test-results/<AFB_RUN_ID>,
 * so each Flow Run writes to its own folder and older ones survive. This
 * prunes the oldest of those folders so at most `keep` remain, the current
 * Run's folder included.
 *
 * 10 covers one full verification cycle (3 runs) plus the targeted repair
 * runs and environment retries that can happen inside it, with margin
 * (decided with the user, 2026-09-30). Override with AFB_KEEP_RUN_OUTPUTS.
 */
export const DEFAULT_KEEP_RUN_OUTPUTS = 10;

export async function pruneRunOutputs(root: string, keep: number, currentFolder: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }

  const folders: { name: string; mtimeMs: number }[] = [];
  for (const name of entries) {
    if (name === currentFolder) continue;
    const info = await stat(join(root, name)).catch(() => null);
    if (info?.isDirectory()) folders.push({ name, mtimeMs: info.mtimeMs });
  }

  folders.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const removed = folders.slice(Math.max(0, keep - 1)).map((folder) => folder.name);
  for (const name of removed) {
    await rm(join(root, name), { recursive: true, force: true });
  }
  return removed;
}

/** Playwright globalSetup entry point: runs once per test run, before any worker. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const keep = Number(process.env.AFB_KEEP_RUN_OUTPUTS ?? DEFAULT_KEEP_RUN_OUTPUTS);
  if (!Number.isInteger(keep) || keep < 1) {
    throw new Error(`AFB_KEEP_RUN_OUTPUTS must be an integer >= 1; received "${process.env.AFB_KEEP_RUN_OUTPUTS}".`);
  }

  const seen = new Set<string>();
  for (const project of config.projects) {
    const outputDir = resolve(project.outputDir);
    const root = dirname(outputDir);
    // Only prune a dedicated parent folder of per-run outputs — never the
    // project root or anything above it.
    if (seen.has(root) || root === resolve(config.rootDir) || root === dirname(root)) continue;
    seen.add(root);
    const removed = await pruneRunOutputs(root, keep, basename(outputDir));
    if (removed.length > 0) {
      console.log(`[agentic-flow-builder] Pruned ${removed.length} old run output folder(s) from ${root} (keeping ${keep}).`);
    }
  }
}
