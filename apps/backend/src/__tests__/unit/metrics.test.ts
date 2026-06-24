import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { registerMetrics, registry } from "../../infrastructure/metrics";

const TOKEN = "test-metrics-token";

function appWith(options: { enabled?: boolean; token?: string; isProduction?: boolean }) {
  const app = express();
  registerMetrics(app, options);
  return app;
}

describe("metrics endpoint", () => {
  it("is not mounted when disabled (opt-in)", async () => {
    const res = await request(appWith({ enabled: false })).get("/metrics");
    assert.equal(res.status, 404);
  });

  it("GET /metrics responds 200 with the Prometheus content type when token matches", async () => {
    const res = await request(appWith({ enabled: true, token: TOKEN }))
      .get("/metrics")
      .set("Authorization", `Bearer ${TOKEN}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], registry.contentType);
  });

  it("exposes default, HTTP, and business metrics", async () => {
    const res = await request(appWith({ enabled: true, token: TOKEN }))
      .get("/metrics")
      .set("Authorization", `Bearer ${TOKEN}`);

    assert.match(res.text, /process_cpu_seconds_total/);
    assert.match(res.text, /http_request_duration_seconds/);
    assert.match(res.text, /drawhaus_active_collaborators/);
  });

  it("rejects requests without the bearer token", async () => {
    const app = appWith({ enabled: true, token: TOKEN });
    assert.equal((await request(app).get("/metrics")).status, 401);
    assert.equal((await request(app).get("/metrics").set("Authorization", "Bearer wrong")).status, 401);
  });

  it("hides the endpoint in production when no token is configured", async () => {
    const res = await request(appWith({ enabled: true, token: "", isProduction: true })).get("/metrics");
    assert.equal(res.status, 404);
  });

  it("serves openly in dev when no token is configured", async () => {
    const res = await request(appWith({ enabled: true, token: "", isProduction: false })).get("/metrics");
    assert.equal(res.status, 200);
  });
});
