import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { ConfigProvider } from "../../../infrastructure/services/config-provider";
import { logger } from "../../../infrastructure/logger";
import type { IntegrationSecretsRepository } from "../../../domain/ports/integration-secrets-repository";

type FakeRepo = IntegrationSecretsRepository & {
  store: Map<string, string>;
  getCalls: string[];
  throwOnGet: boolean;
};

function makeRepo(initial: Record<string, string> = {}): FakeRepo {
  const store = new Map<string, string>(Object.entries(initial));
  const getCalls: string[] = [];
  return {
    store,
    getCalls,
    throwOnGet: false,
    async get(key: string) {
      getCalls.push(key);
      if (this.throwOnGet) throw new Error("db down");
      return store.get(key) ?? null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async listKeys() {
      return [...store.keys()].map((key) => ({ key, updatedAt: new Date() }));
    },
  };
}

const ENV_BACKUP: Record<string, string | undefined> = {};
const TEST_KEYS = ["CFG_TEST_A", "CFG_TEST_B", "CFG_TEST_C"];

beforeEach(() => {
  for (const key of TEST_KEYS) {
    ENV_BACKUP[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of TEST_KEYS) {
    if (ENV_BACKUP[key] === undefined) delete process.env[key];
    else process.env[key] = ENV_BACKUP[key];
  }
  mock.restoreAll();
});

describe("ConfigProvider.get — repository path", () => {
  it("returns the DB value when the repo has it and caches it", async () => {
    const repo = makeRepo({ CFG_TEST_A: "db-value" });
    const provider = new ConfigProvider(repo);

    const value = await provider.get("CFG_TEST_A");

    assert.equal(value, "db-value");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A"]);

    // Second call hits cache, NOT the repo
    await provider.get("CFG_TEST_A");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A"]);
  });

  it("falls back to process.env when the repo returns null", async () => {
    process.env.CFG_TEST_A = "env-value";
    const repo = makeRepo();
    const provider = new ConfigProvider(repo);

    const value = await provider.get("CFG_TEST_A");

    assert.equal(value, "env-value");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A"]);
  });

  it("logs a warning and falls back to process.env when the repo throws", async () => {
    process.env.CFG_TEST_A = "env-fallback";
    const repo = makeRepo();
    repo.throwOnGet = true;
    const provider = new ConfigProvider(repo);
    const warnMock = mock.method(logger, "warn", () => {});

    const value = await provider.get("CFG_TEST_A");

    assert.equal(value, "env-fallback");
    assert.equal(warnMock.mock.calls.length, 1);
    const [meta, msg] = warnMock.mock.calls[0].arguments as [{ err: Error; key: string }, string];
    assert.ok(meta.err instanceof Error);
    assert.equal(meta.key, "CFG_TEST_A");
    assert.match(msg, /ConfigProvider/);
  });
});

describe("ConfigProvider.get — env-only path", () => {
  it("uses process.env when secretsRepo is null", async () => {
    process.env.CFG_TEST_A = "env-only-value";
    const provider = new ConfigProvider(null);

    const value = await provider.get("CFG_TEST_A");

    assert.equal(value, "env-only-value");
  });

  it("returns empty string when the env var is unset and there is no repo", async () => {
    const provider = new ConfigProvider(null);

    const value = await provider.get("CFG_TEST_A");

    assert.equal(value, "");
  });
});

describe("ConfigProvider — cache TTL", () => {
  it("re-fetches after the 60-second TTL expires", async () => {
    const repo = makeRepo({ CFG_TEST_A: "v1" });
    const provider = new ConfigProvider(repo);

    let now = 1_000_000;
    const nowMock = mock.method(Date, "now", () => now);

    assert.equal(await provider.get("CFG_TEST_A"), "v1");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A"]);

    // Within TTL: cache hit
    now += 59_000;
    assert.equal(await provider.get("CFG_TEST_A"), "v1");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A"]);

    // After TTL: re-fetch
    repo.store.set("CFG_TEST_A", "v2");
    now += 2_000;
    assert.equal(await provider.get("CFG_TEST_A"), "v2");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A", "CFG_TEST_A"]);

    nowMock.mock.restore();
  });
});

describe("ConfigProvider.invalidate", () => {
  it("removes only the targeted key from the cache", async () => {
    const repo = makeRepo({ CFG_TEST_A: "a1", CFG_TEST_B: "b1" });
    const provider = new ConfigProvider(repo);

    await provider.get("CFG_TEST_A");
    await provider.get("CFG_TEST_B");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A", "CFG_TEST_B"]);

    provider.invalidate("CFG_TEST_A");

    // A re-fetches, B still cached
    repo.store.set("CFG_TEST_A", "a2");
    repo.store.set("CFG_TEST_B", "b2");
    assert.equal(await provider.get("CFG_TEST_A"), "a2");
    assert.equal(await provider.get("CFG_TEST_B"), "b1");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A", "CFG_TEST_B", "CFG_TEST_A"]);
  });

  it("clears the entire cache when called with no argument", async () => {
    const repo = makeRepo({ CFG_TEST_A: "a1", CFG_TEST_B: "b1" });
    const provider = new ConfigProvider(repo);

    await provider.get("CFG_TEST_A");
    await provider.get("CFG_TEST_B");

    provider.invalidate();

    repo.store.set("CFG_TEST_A", "a2");
    repo.store.set("CFG_TEST_B", "b2");
    assert.equal(await provider.get("CFG_TEST_A"), "a2");
    assert.equal(await provider.get("CFG_TEST_B"), "b2");
    assert.deepEqual(repo.getCalls, ["CFG_TEST_A", "CFG_TEST_B", "CFG_TEST_A", "CFG_TEST_B"]);
  });
});
