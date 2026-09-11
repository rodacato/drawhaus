import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { configureTrustProxy } from "../../infrastructure/http/trust-proxy";

function appReportingIp() {
  const app = express();
  configureTrustProxy(app);
  app.get("/ip", (req, res) => res.json({ ip: req.ip }));
  return app;
}

describe("configureTrustProxy", () => {
  it("resolves the client behind cloudflared and kamal-proxy", async () => {
    const res = await request(appReportingIp())
      .get("/ip")
      .set("X-Forwarded-For", "203.0.113.7, 172.17.0.1");
    assert.equal(res.body.ip, "203.0.113.7");
  });

  it("ignores addresses a client prepends to X-Forwarded-For", async () => {
    const res = await request(appReportingIp())
      .get("/ip")
      .set("X-Forwarded-For", "198.51.100.66, 203.0.113.7, 172.17.0.1");
    assert.equal(res.body.ip, "203.0.113.7");
  });
});
