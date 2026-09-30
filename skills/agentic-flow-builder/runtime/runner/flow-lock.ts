import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { FlowLockError } from '../errors';

interface LockRecord {
  runId: string;
  pid: number;
  createdAt: string;
}

export class FlowLock {
  constructor(private readonly lockPath: string) {}

  async acquireOrJoin(runId: string): Promise<void> {
    await mkdir(dirname(this.lockPath), { recursive: true });
    const record: LockRecord = { runId, pid: process.pid, createdAt: new Date().toISOString() };
    if (await this.tryCreate(record)) return;

    const existing = await this.read();
    if (existing?.runId === runId) {
      // Playwright replaces a worker after a failed test, within the same
      // Run. Record the live worker's pid so the stale-lock check below
      // keeps protecting a Run that is still in progress.
      if (existing.pid !== process.pid) {
        await writeFile(this.lockPath, JSON.stringify({ ...existing, pid: process.pid }, null, 2), 'utf8');
      }
      return;
    }

    if (existing && !isProcessAlive(existing.pid)) {
      console.warn(
        `[agentic-flow-builder] Replacing stale Flow lock of run "${existing.runId}" ` +
          `(pid ${existing.pid} is no longer running).`,
      );
      await rm(this.lockPath, { force: true });
      if (await this.tryCreate(record)) return;
    }

    throw new FlowLockError(`Flow is already locked by run "${existing?.runId ?? 'unknown'}".`);
  }

  async release(runId: string): Promise<void> {
    const existing = await this.read();
    if (!existing) return;
    if (existing.runId !== runId) {
      throw new FlowLockError(`Run "${runId}" cannot release lock owned by "${existing.runId}".`);
    }
    await rm(this.lockPath, { force: true });
  }

  private async tryCreate(record: LockRecord): Promise<boolean> {
    try {
      await writeFile(this.lockPath, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
      return true;
    } catch {
      return false;
    }
  }

  private async read(): Promise<LockRecord | null> {
    try {
      return JSON.parse(await readFile(this.lockPath, 'utf8')) as LockRecord;
    } catch {
      return null;
    }
  }
}

/**
 * Signal 0 checks for existence without affecting the process. ESRCH means
 * no such process; EPERM means it exists but belongs to another user, so it
 * counts as alive.
 */
function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
