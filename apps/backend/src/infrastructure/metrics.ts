import { type Express, type RequestHandler } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import client from "prom-client";
import { config } from "./config";

export const registry = new client.Registry();

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

function tokenMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && provided.length === expected.length;
}

// /metrics sits on the public hostname (behind kamal-proxy/Cloudflare), so a
// bearer token gates it. No token configured: hidden in production (404),
// open in dev for convenience.
function makeRequireToken(token: string, isProduction: boolean): RequestHandler {
  return (req, res, next) => {
    if (!token) {
      if (isProduction) {
        res.sendStatus(404);
        return;
      }
      next();
      return;
    }
    const header = req.get("authorization") ?? "";
    const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (provided && tokenMatches(provided, token)) {
      next();
      return;
    }
    res.sendStatus(401);
  };
}

let defaultMetricsCollected = false;

// Opt-in: when disabled, neither the endpoint nor the instrumentation overhead
// is mounted, so a self-hoster who wants nothing pays nothing.
export function registerMetrics(
  app: Express,
  options: { enabled?: boolean; token?: string; isProduction?: boolean } = {},
): void {
  const enabled = options.enabled ?? config.metricsEnabled;
  if (!enabled) return;

  const token = options.token ?? config.metricsToken;
  const isProduction = options.isProduction ?? config.nodeEnv === "production";

  if (!defaultMetricsCollected) {
    client.collectDefaultMetrics({ register: registry });
    defaultMetricsCollected = true;
  }

  app.use(metricsMiddleware);
  app.get("/metrics", makeRequireToken(token, isProduction), async (_req, res) => {
    res.set("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  });
}
