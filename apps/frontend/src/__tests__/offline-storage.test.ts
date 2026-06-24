import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  saveOfflineSnapshot,
  getOfflineSnapshot,
  deleteOfflineSnapshot,
  type OfflineSnapshot,
} from "../lib/offline-storage";

type AnyFn = ((..._args: unknown[]) => unknown) | null;

class FakeRequest {
  result: unknown = null;
  error: DOMException | null = null;
  onsuccess: AnyFn = null;
  onerror: AnyFn = null;
  onupgradeneeded: AnyFn = null;
}

class FakeObjectStore {
  constructor(private readonly store: Map<string, unknown>, private readonly tx: FakeTransaction) {}
  put(value: { diagramId: string }) {
    if (this.tx.failPut) {
      queueMicrotask(() => this.tx.onerror?.());
      return new FakeRequest();
    }
    this.store.set(value.diagramId, value);
    return new FakeRequest();
  }
  get(key: string) {
    const req = new FakeRequest();
    if (this.tx.failGet) {
      req.error = new Error("read failure") as unknown as DOMException;
      queueMicrotask(() => req.onerror?.());
      return req;
    }
    req.result = this.store.get(key);
    queueMicrotask(() => req.onsuccess?.());
    return req;
  }
  delete(key: string) {
    if (this.tx.failDelete) {
      queueMicrotask(() => this.tx.onerror?.());
      return new FakeRequest();
    }
    this.store.delete(key);
    return new FakeRequest();
  }
}

class FakeTransaction {
  oncomplete: AnyFn = null;
  onerror: AnyFn = null;
  error: DOMException | null = null;
  failPut = false;
  failGet = false;
  failDelete = false;
  constructor(private readonly store: Map<string, unknown>) {}
  objectStore() {
    return new FakeObjectStore(this.store, this);
  }
}

type FakeDBOptions = {
  txFactory?: (store: Map<string, unknown>) => FakeTransaction;
  containsStore?: boolean;
};

class FakeDatabase {
  objectStoreNames: { contains: (n: string) => boolean };
  createObjectStoreCalled = false;
  constructor(public store: Map<string, unknown>, private readonly opts: FakeDBOptions) {
    this.objectStoreNames = { contains: () => opts.containsStore ?? true };
  }
  createObjectStore() {
    this.createObjectStoreCalled = true;
  }
  transaction() {
    const tx = this.opts.txFactory ? this.opts.txFactory(this.store) : new FakeTransaction(this.store);
    queueMicrotask(() => {
      if (!tx.failPut && !tx.failGet && !tx.failDelete) tx.oncomplete?.();
    });
    return tx;
  }
}

function installFakeIDB(opts: FakeDBOptions & { failOpen?: boolean } = {}) {
  const store = new Map<string, unknown>();
  const fakeIDB = {
    open: () => {
      const req = new FakeRequest();
      queueMicrotask(() => {
        if (opts.failOpen) {
          req.error = new Error("open failure") as unknown as DOMException;
          req.onerror?.();
          return;
        }
        const db = new FakeDatabase(store, opts);
        req.result = db;
        if (!(opts.containsStore ?? true)) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = fakeIDB;
  return { store, fakeIDB };
}

const sample = (id = "d1"): OfflineSnapshot => ({
  diagramId: id,
  userId: "u1",
  userName: "Adrian",
  elements: [{ x: 1 }],
  appState: { viewBackgroundColor: "#fff" },
  savedAt: "2026-06-24T00:00:00Z",
});

describe("offline-storage", () => {
  const originalIDB = (globalThis as unknown as { indexedDB?: unknown }).indexedDB;

  beforeEach(() => installFakeIDB());
  afterEach(() => {
    (globalThis as unknown as { indexedDB: unknown }).indexedDB = originalIDB;
  });

  test("save then get returns the stored snapshot", async () => {
    await saveOfflineSnapshot(sample());
    const result = await getOfflineSnapshot("d1");
    assert.deepEqual(result, sample());
  });

  test("get returns null when no snapshot stored", async () => {
    const result = await getOfflineSnapshot("missing");
    assert.equal(result, null);
  });

  test("save overwrites prior snapshot for the same diagramId", async () => {
    await saveOfflineSnapshot(sample());
    const updated = { ...sample(), userName: "New" };
    await saveOfflineSnapshot(updated);
    const result = await getOfflineSnapshot("d1");
    assert.equal((result as OfflineSnapshot).userName, "New");
  });

  test("delete removes the snapshot", async () => {
    await saveOfflineSnapshot(sample());
    await deleteOfflineSnapshot("d1");
    const result = await getOfflineSnapshot("d1");
    assert.equal(result, null);
  });

  test("upgrade path creates the object store when missing", async () => {
    installFakeIDB({ containsStore: false });
    await saveOfflineSnapshot(sample());
    const result = await getOfflineSnapshot("d1");
    assert.deepEqual(result, sample());
  });

  test("rejects with fallback Error when openDB fails without DOMException", async () => {
    installFakeIDB({ failOpen: true });
    await assert.rejects(() => saveOfflineSnapshot(sample()), /open failure/);
  });

  test("rejects with fallback Error when get request fails", async () => {
    installFakeIDB({ txFactory: (store) => {
      const tx = new FakeTransaction(store);
      tx.failGet = true;
      return tx;
    } });
    await assert.rejects(() => getOfflineSnapshot("d1"), /read failure/);
  });

  test("rejects when save transaction errors", async () => {
    installFakeIDB({ txFactory: (store) => {
      const tx = new FakeTransaction(store);
      tx.failPut = true;
      return tx;
    } });
    await assert.rejects(() => saveOfflineSnapshot(sample()), /Failed to save offline snapshot/);
  });

  test("rejects when delete transaction errors", async () => {
    installFakeIDB({ txFactory: (store) => {
      const tx = new FakeTransaction(store);
      tx.failDelete = true;
      return tx;
    } });
    await assert.rejects(() => deleteOfflineSnapshot("d1"), /Failed to delete offline snapshot/);
  });
});
