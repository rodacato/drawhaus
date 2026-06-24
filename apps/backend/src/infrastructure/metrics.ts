import express, { type Express, type RequestHandler } from "express";
import client from "prom-client";

export const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// Live real-time collaboration is drawhaus' core value and main load driver:
// every connected client holds a socket + Redis pub/sub fan-out. This gauge is
// per-process — sum across instances in PromQL when running multi-container.
export const activeCollaborators = new client.Gauge({
  name: "drawhaus_active_collaborators",
  help: "Currently connected real-time collaboration clients (Socket.IO)",
  registers: [registry],
});

// Uses the matched route pattern (e.g. /api/diagrams/:id), never the raw URL,
// to keep label cardinality bounded; unmatched requests collapse to "unmatched".
export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const stopTimer = httpRequestDuration.startTimer();
  res.on("finish", () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.baseUrl || "unmatched";
    stopTimer({ method: req.method, route, status_code: res.statusCode });
  });
  next();
};

export function createMetricsApp(): Express {
  const app = express();
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });
  return app;
}
