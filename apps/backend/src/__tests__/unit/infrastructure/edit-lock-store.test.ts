import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EditLockStore } from "../../../infrastructure/socket/edit-lock-store";

describe("EditLockStore", () => {
  let store: EditLockStore;

  afterEach(() => {
    store?.stopAll();
  });

  it("acquires lock when no one holds it", () => {
    store = new EditLockStore();
    const result = store.tryAcquire("d1", "u1", "Alice", "s1");
    assert.equal(result.acquired, true);
    assert.equal(store.hasLock("d1", "u1"), true);
  });

  it("re-acquires own lock (touch)", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    const result = store.tryAcquire("d1", "u1", "Alice", "s1");
    assert.equal(result.acquired, true);
  });

  it("enqueues second user when lock is held", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    const result = store.tryAcquire("d1", "u2", "Bob", "s2");
    assert.equal(result.acquired, false);
    assert.equal("queued" in result && result.queued, true);
    if (!result.acquired && "position" in result) {
      assert.equal(result.position, 1);
    }
  });

  it("returns correct queue position for multiple users", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");
    store.tryAcquire("d1", "u3", "Carol", "s3");

    assert.equal(store.getQueuePosition("d1", "u2"), 1);
    assert.equal(store.getQueuePosition("d1", "u3"), 2);
    assert.equal(store.getQueuePosition("d1", "u1"), 0); // holder, not in queue
  });

  it("does not duplicate queue entries on retry", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");
    store.tryAcquire("d1", "u2", "Bob", "s2");

    assert.equal(store.getQueue("d1").length, 1);
  });

  it("promotes next user on explicit release", () => {
    store = new EditLockStore();
    let promoted: string | null = null;
    store.setOnRelease((_diagramId, _prev, next) => {
      promoted = next?.userId ?? null;
    });

    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");
    store.releaseLock("d1", "u1");

    assert.equal(promoted, "u2");
    assert.equal(store.hasLock("d1", "u2"), true);
    assert.equal(store.hasLock("d1", "u1"), false);
  });

  it("promotes in FIFO order", () => {
    store = new EditLockStore();
    const promotions: string[] = [];
    store.setOnRelease((_diagramId, _prev, next) => {
      if (next) promotions.push(next.userId);
    });

    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");
    store.tryAcquire("d1", "u3", "Carol", "s3");

    store.releaseLock("d1", "u1");
    assert.equal(store.hasLock("d1", "u2"), true);

    store.releaseLock("d1", "u2");
    assert.equal(store.hasLock("d1", "u3"), true);

    assert.deepEqual(promotions, ["u2", "u3"]);
  });

  it("cleans up on releaseBySocketId", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");

    // Disconnect socket s2 (queued user)
    store.releaseBySocketId("s2");
    assert.equal(store.getQueuePosition("d1", "u2"), 0); // removed from queue

    // Disconnect socket s1 (lock holder)
    const released = store.releaseBySocketId("s1");
    assert.deepEqual(released, ["d1"]);
    assert.equal(store.getLock("d1"), null);
  });

  it("promotes next when holder disconnects", () => {
    store = new EditLockStore();
    let promoted: string | null = null;
    store.setOnRelease((_diagramId, _prev, next) => {
      promoted = next?.userId ?? null;
    });

    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");
    store.releaseBySocketId("s1");

    assert.equal(promoted, "u2");
    assert.equal(store.hasLock("d1", "u2"), true);
  });

  it("auto-releases after inactivity timeout", async () => {
    store = new EditLockStore();
    let released = false;
    store.setOnRelease(() => { released = true; });

    store.tryAcquire("d1", "u1", "Alice", "s1");
    assert.equal(store.hasLock("d1", "u1"), true);

    // Wait for timeout (2.5s) + buffer
    await new Promise((r) => setTimeout(r, 3000));
    assert.equal(store.hasLock("d1", "u1"), false);
    assert.equal(released, true);
  });

  it("touchLock resets inactivity timer", async () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");

    // Touch at 1.5s — should reset the 2.5s timer
    await new Promise((r) => setTimeout(r, 1500));
    store.touchLock("d1", "u1");

    // At 3s from start (1.5s after touch), should still hold
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(store.hasLock("d1", "u1"), true);

    // At 4.5s from start (3s after touch), should be released
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(store.hasLock("d1", "u1"), false);
  });

  it("stopAll clears all state", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d1", "u2", "Bob", "s2");
    store.tryAcquire("d2", "u3", "Carol", "s3");

    store.stopAll();

    assert.equal(store.getLock("d1"), null);
    assert.equal(store.getLock("d2"), null);
    assert.equal(store.getQueue("d1").length, 0);
  });

  it("getLock returns holder info", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");

    const holder = store.getLock("d1");
    assert.ok(holder);
    assert.equal(holder.userId, "u1");
    assert.equal(holder.userName, "Alice");
    assert.equal(holder.socketId, "s1");
  });

  it("releaseLock returns false for non-holder", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    assert.equal(store.releaseLock("d1", "u2"), false);
    assert.equal(store.hasLock("d1", "u1"), true);
  });

  it("handles multiple diagrams independently", () => {
    store = new EditLockStore();
    store.tryAcquire("d1", "u1", "Alice", "s1");
    store.tryAcquire("d2", "u2", "Bob", "s2");

    assert.equal(store.hasLock("d1", "u1"), true);
    assert.equal(store.hasLock("d2", "u2"), true);
    assert.equal(store.hasLock("d1", "u2"), false);
    assert.equal(store.hasLock("d2", "u1"), false);
  });
});
