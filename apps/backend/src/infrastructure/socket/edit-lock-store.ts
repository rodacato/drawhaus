export interface LockHolder {
  userId: string;
  userName: string;
  socketId: string;
  acquiredAt: number;
  lastActivityAt: number;
}

export interface EditLockChecker {
  hasLock(diagramId: string, userId: string): boolean;
  touchLock(diagramId: string, userId: string): void;
}

/** Auto-release after 5 seconds of inactivity */
const INACTIVITY_TIMEOUT_MS = 5_000;

/** Grace period: previous holder gets priority to re-acquire after auto-release */
const RECONNECT_GRACE_MS = 3_000;

interface GraceHolder {
  userId: string;
  userName: string;
  expiresAt: number;
}

export class EditLockStore implements EditLockChecker {
  private locks = new Map<string, LockHolder>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private graceHolders = new Map<string, GraceHolder>();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private onRelease: ((diagramId: string, previousHolder: LockHolder) => void) | null = null;

  /** Register callback invoked when a lock is auto-released by inactivity */
  setOnRelease(cb: (diagramId: string, previousHolder: LockHolder) => void): void {
    this.onRelease = cb;
  }

  /** Try to acquire; returns holder info if denied */
  tryAcquire(
    diagramId: string,
    userId: string,
    userName: string,
    socketId: string,
  ): { acquired: boolean; holder: LockHolder | null } {
    const existing = this.locks.get(diagramId);
    if (!existing) {
      // Grace period: previous holder gets priority to re-acquire
      const grace = this.graceHolders.get(diagramId);
      if (grace && grace.userId !== userId && grace.expiresAt > Date.now()) {
        return { acquired: false, holder: null };
      }
      this.clearGrace(diagramId);
      this.acquireLock(diagramId, userId, userName, socketId);
      return { acquired: true, holder: null };
    }
    if (existing.userId === userId) {
      this.touchLock(diagramId, userId);
      return { acquired: true, holder: null };
    }
    return { acquired: false, holder: { ...existing } };
  }

  acquireLock(diagramId: string, userId: string, userName: string, socketId: string): boolean {
    const existing = this.locks.get(diagramId);
    if (existing && existing.userId !== userId) return false;
    if (existing && existing.userId === userId) {
      existing.lastActivityAt = Date.now();
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
    this.resetTimer(diagramId);
    return true;
  }

  releaseLock(diagramId: string, userId: string): boolean {
    const holder = this.locks.get(diagramId);
    if (!holder || holder.userId !== userId) return false;
    this.locks.delete(diagramId);
    this.clearTimer(diagramId);
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
      }
    }
    return released;
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
          // Set grace period so the same user can re-acquire quickly
          this.setGrace(diagramId, prev.userId, prev.userName);
          this.onRelease?.(diagramId, prev);
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
  }
}
