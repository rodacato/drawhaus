export interface LockHolder {
  userId: string;
  userName: string;
  socketId: string;
  acquiredAt: number;
  lastActivityAt: number;
}

export interface QueueEntry {
  userId: string;
  userName: string;
  socketId: string;
}

export type LockResult =
  | { acquired: true; holder: null }
  | { acquired: false; queued: true; position: number; holder: LockHolder }
  | { acquired: false; queued: false; holder: LockHolder };

export interface EditLockChecker {
  hasLock(diagramId: string, userId: string): boolean;
  touchLock(diagramId: string, userId: string): void;
}

export interface EditLockService extends EditLockChecker {
  tryAcquire(diagramId: string, userId: string, userName: string, socketId: string): LockResult;
  releaseLock(diagramId: string, userId: string): boolean;
  releaseBySocketId(socketId: string): string[];
  getLock(diagramId: string): LockHolder | null;
  getQueuePosition(diagramId: string, userId: string): number;
  acquireLock(diagramId: string, userId: string, userName: string, socketId: string): boolean;
  setOnRelease(cb: (diagramId: string, previousHolder: LockHolder, nextHolder: LockHolder | null) => void): void;
  stopAll(): void;
}

/** Auto-release after 2.5 seconds of inactivity */
const INACTIVITY_TIMEOUT_MS = 2_500;

/** Grace period: previous holder gets priority to re-acquire after auto-release */
const RECONNECT_GRACE_MS = 1_000;

interface GraceHolder {
  userId: string;
  userName: string;
  expiresAt: number;
}

export class EditLockStore implements EditLockService {
  private locks = new Map<string, LockHolder>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private graceHolders = new Map<string, GraceHolder>();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private queues = new Map<string, QueueEntry[]>();
  private onReleaseCb: ((diagramId: string, previousHolder: LockHolder, nextHolder: LockHolder | null) => void) | null = null;

  /** Register callback invoked when a lock is released (by timeout, explicit release, or disconnect) */
  setOnRelease(cb: (diagramId: string, previousHolder: LockHolder, nextHolder: LockHolder | null) => void): void {
    this.onReleaseCb = cb;
  }

  /** Try to acquire; if denied, enqueue the user */
  tryAcquire(
    diagramId: string,
    userId: string,
    userName: string,
    socketId: string,
  ): LockResult {
    const existing = this.locks.get(diagramId);
    if (!existing) {
      // Grace period: previous holder gets priority to re-acquire
      const grace = this.graceHolders.get(diagramId);
      if (grace && grace.userId !== userId && grace.expiresAt > Date.now()) {
        // Enqueue instead of flat deny during grace
        const position = this.enqueue(diagramId, userId, userName, socketId);
        return { acquired: false, queued: true, position, holder: { userId: grace.userId, userName: grace.userName, socketId: "", acquiredAt: 0, lastActivityAt: 0 } };
      }
      this.clearGrace(diagramId);
      this.acquireLock(diagramId, userId, userName, socketId);
      return { acquired: true, holder: null };
    }
    if (existing.userId === userId) {
      this.touchLock(diagramId, userId);
      return { acquired: true, holder: null };
    }
    // Lock is held by someone else — enqueue
    const position = this.enqueue(diagramId, userId, userName, socketId);
    return { acquired: false, queued: true, position, holder: { ...existing } };
  }

  acquireLock(diagramId: string, userId: string, userName: string, socketId: string): boolean {
    const existing = this.locks.get(diagramId);
    if (existing && existing.userId !== userId) return false;
    if (existing && existing.userId === userId) {
      existing.lastActivityAt = Date.now();
      existing.socketId = socketId;
      this.resetTimer(diagramId);
      return true;
    }
    this.locks.set(diagramId, {
      userId,
      userName,
      socketId,
      acquiredAt: Date.now(),
      lastActivityAt: Date.now(),
    });
    // Remove from queue if they were waiting
    this.removeFromQueueByUser(diagramId, userId);
    this.resetTimer(diagramId);
    return true;
  }

  releaseLock(diagramId: string, userId: string): boolean {
    const holder = this.locks.get(diagramId);
    if (!holder || holder.userId !== userId) return false;
    this.locks.delete(diagramId);
    this.clearTimer(diagramId);
    this.promoteNext(diagramId, holder);
    return true;
  }

  getLock(diagramId: string): LockHolder | null {
    return this.locks.get(diagramId) ?? null;
  }

  hasLock(diagramId: string, userId: string): boolean {
    return this.locks.get(diagramId)?.userId === userId;
  }

  touchLock(diagramId: string, userId: string): void {
    const holder = this.locks.get(diagramId);
    if (holder && holder.userId === userId) {
      holder.lastActivityAt = Date.now();
      this.resetTimer(diagramId);
    }
  }

  /** Release all locks held by a disconnecting socket */
  releaseBySocketId(socketId: string): string[] {
    const released: string[] = [];
    for (const [diagramId, holder] of this.locks) {
      if (holder.socketId === socketId) {
        released.push(diagramId);
        this.locks.delete(diagramId);
        this.clearTimer(diagramId);
        this.promoteNext(diagramId, holder);
      }
    }
    // Also remove from any queues
    for (const [diagramId, queue] of this.queues) {
      const idx = queue.findIndex((e) => e.socketId === socketId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        if (queue.length === 0) this.queues.delete(diagramId);
      }
    }
    return released;
  }

  /** Get queue position (1-based). Returns 0 if not in queue. */
  getQueuePosition(diagramId: string, userId: string): number {
    const queue = this.queues.get(diagramId);
    if (!queue) return 0;
    const idx = queue.findIndex((e) => e.userId === userId);
    return idx === -1 ? 0 : idx + 1;
  }

  /** Get the full queue for a diagram */
  getQueue(diagramId: string): QueueEntry[] {
    return this.queues.get(diagramId) ?? [];
  }

  private enqueue(diagramId: string, userId: string, userName: string, socketId: string): number {
    let queue = this.queues.get(diagramId);
    if (!queue) {
      queue = [];
      this.queues.set(diagramId, queue);
    }
    // Don't duplicate
    const existing = queue.findIndex((e) => e.userId === userId);
    if (existing !== -1) {
      queue[existing].socketId = socketId; // update socket if reconnected
      return existing + 1;
    }
    queue.push({ userId, userName, socketId });
    return queue.length;
  }

  private removeFromQueueByUser(diagramId: string, userId: string): void {
    const queue = this.queues.get(diagramId);
    if (!queue) return;
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      if (queue.length === 0) this.queues.delete(diagramId);
    }
  }

  /** Promote next user in queue to lock holder after a release */
  private promoteNext(diagramId: string, previousHolder: LockHolder): void {
    const queue = this.queues.get(diagramId);
    const next = queue?.shift() ?? null;
    if (queue && queue.length === 0) this.queues.delete(diagramId);

    let nextHolder: LockHolder | null = null;
    if (next) {
      this.locks.set(diagramId, {
        userId: next.userId,
        userName: next.userName,
        socketId: next.socketId,
        acquiredAt: Date.now(),
        lastActivityAt: Date.now(),
      });
      this.resetTimer(diagramId);
      nextHolder = this.locks.get(diagramId)!;
    }

    // Set grace period for previous holder (only if no one was promoted)
    if (!nextHolder) {
      this.setGrace(diagramId, previousHolder.userId, previousHolder.userName);
    }

    this.onReleaseCb?.(diagramId, previousHolder, nextHolder);
  }

  private resetTimer(diagramId: string): void {
    this.clearTimer(diagramId);
    this.timers.set(
      diagramId,
      setTimeout(() => {
        const holder = this.locks.get(diagramId);
        if (holder) {
          const prev = { ...holder };
          this.locks.delete(diagramId);
          this.timers.delete(diagramId);
          this.promoteNext(diagramId, prev);
        }
      }, INACTIVITY_TIMEOUT_MS),
    );
  }

  private clearTimer(diagramId: string): void {
    const timer = this.timers.get(diagramId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(diagramId);
    }
  }

  private setGrace(diagramId: string, userId: string, userName: string): void {
    this.clearGrace(diagramId);
    this.graceHolders.set(diagramId, {
      userId,
      userName,
      expiresAt: Date.now() + RECONNECT_GRACE_MS,
    });
    this.graceTimers.set(
      diagramId,
      setTimeout(() => {
        this.graceHolders.delete(diagramId);
        this.graceTimers.delete(diagramId);
      }, RECONNECT_GRACE_MS),
    );
  }

  private clearGrace(diagramId: string): void {
    const timer = this.graceTimers.get(diagramId);
    if (timer) {
      clearTimeout(timer);
      this.graceTimers.delete(diagramId);
    }
    this.graceHolders.delete(diagramId);
  }

  stopAll(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    this.graceTimers.clear();
    this.graceHolders.clear();
    this.locks.clear();
    this.queues.clear();
  }
}
