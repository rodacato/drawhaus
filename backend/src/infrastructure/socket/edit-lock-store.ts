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

/** Auto-release after 3 seconds of inactivity */
const INACTIVITY_TIMEOUT_MS = 3_000;

export class EditLockStore implements EditLockChecker {
  private locks = new Map<string, LockHolder>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
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

  stopAll(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.locks.clear();
  }
}
