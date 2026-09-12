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
    try {
      await writeFile(this.lockPath, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
      return;
    } catch {
      const existing = await this.read();
      if (existing?.runId === runId) return;
      throw new FlowLockError(`Flow is already locked by run "${existing?.runId ?? 'unknown'}".`);
    }
  }

  async release(runId: string): Promise<void> {
    const existing = await this.read();
    if (!existing) return;
    if (existing.runId !== runId) {
      throw new FlowLockError(`Run "${runId}" cannot release lock owned by "${existing.runId}".`);
    }
    await rm(this.lockPath, { force: true });
  }

  private async read(): Promise<LockRecord | null> {
    try {
      return JSON.parse(await readFile(this.lockPath, 'utf8')) as LockRecord;
    } catch {
      return null;
    }
  }
}
