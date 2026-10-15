import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { createSetupLock } from "../../infrastructure/http/middleware/setup-lock";
import { InMemorySiteSettingsRepository } from "../fakes/in-memory-site-settings-repository";

function run(middleware: ReturnType<typeof createSetupLock>["middleware"], path: string) {
  const calls: unknown[][] = [];
  const result = middleware({ path } as Request, {} as Response, (...args: unknown[]) => {
    calls.push(args);
  });
  return { result, calls };
}

describe("setup lock", () => {
  it("hands a settings lookup failure to the error handler instead of rejecting", async () => {
    const settings = new InMemorySiteSettingsRepository();
    const failure = new Error("connection terminated");
    settings.get = async () => {
      throw failure;
    };
    const { middleware } = createSetupLock(settings);

    const { result, calls } = run(middleware, "/api/diagrams");

    await assert.doesNotReject(Promise.resolve(result));
    assert.deepEqual(calls, [[failure]]);
  });

  it("recovers on the next request once the lookup works again", async () => {
    const settings = new InMemorySiteSettingsRepository();
    const original = settings.get.bind(settings);
    settings.get = async () => {
      throw new Error("down");
    };
    const { middleware } = createSetupLock(settings);
    await run(middleware, "/api/diagrams").result;

    settings.get = original;
    settings.current.setupCompleted = true;
    const { calls } = run(middleware, "/api/diagrams");
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(calls, [[]]);
  });
});
