import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createMetricsApp, registry, activeCollaborators } from "../../infrastructure/metrics";

describe("metrics endpoint", () => {
  it("GET /metrics responds 200 with the Prometheus content type", async () => {
    const res = await request(createMetricsApp()).get("/metrics");

    assert.equal(res.status, 200);
    assert.equal(res.headers["content-type"], registry.contentType);
  });

  it("exposes default, HTTP, and business metrics", async () => {
    const res = await request(createMetricsApp()).get("/metrics");

    assert.match(res.text, /process_cpu_seconds_total/);
    assert.match(res.text, /http_request_duration_seconds/);
    assert.match(res.text, /drawhaus_active_collaborators/);
  });

  it("tracks active collaborators via the gauge", async () => {
    const before = (await registry.getSingleMetricAsString("drawhaus_active_collaborators")) ?? "";
    activeCollaborators.inc();
    activeCollaborators.dec();
    const after = (await registry.getSingleMetricAsString("drawhaus_active_collaborators")) ?? "";

    assert.ok(before.includes("drawhaus_active_collaborators"));
    assert.ok(after.includes("drawhaus_active_collaborators"));
  });
});
