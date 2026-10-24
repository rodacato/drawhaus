import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { errorHandler } from "../../../infrastructure/http/middleware/error-handler";
import { requestLogger } from "../../../infrastructure/http/middleware/request-logger";

type Entry = { level: string; obj: Record<string, unknown>; msg: string };

function appWithLog(entries: Entry[]) {
  const app = express();
  const log = (level: string) => (obj: Record<string, unknown>, msg: string) =>
    entries.push({ level, obj, msg });
  app.use((req, _res, next) => {
    req.log = { info: log("info"), warn: log("warn"), error: log("error") } as never;
    next();
  });
  app.use(requestLogger);
  app.get("/boom", () => {
    throw new Error("kaboom");
  });
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/metrics", (_req, res) => {
    res.send("");
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("logs the error under `err` with a stable message and answers 500 without leaking it", async () => {
    const entries: Entry[] = [];
    const res = await request(appWithLog(entries)).get("/boom");

    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: "Internal server error" });
    const logged = entries.find((e) => e.level === "error");
    assert.equal(logged?.msg, "unhandled request error");
    assert.equal((logged?.obj.err as Error).message, "kaboom");
  });
});

describe("requestLogger", () => {
  it("does not log /health or /metrics but logs everything else", async () => {
    const entries: Entry[] = [];
    const app = appWithLog(entries);
    await request(app).get("/health");
    await request(app).get("/metrics");
    assert.equal(entries.length, 0);

    await request(app).get("/boom");
    assert.ok(entries.some((e) => e.level === "info" && e.obj.url === "/boom"));
  });
});
