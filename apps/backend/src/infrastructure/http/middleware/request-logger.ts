import type { RequestHandler } from "express";

const UNLOGGED_PATHS = new Set(["/metrics", "/health", "/v1/health"]);

export const requestLogger: RequestHandler = (req, res, next) => {
  if (UNLOGGED_PATHS.has(req.path)) {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    req.log.info(
      { method: req.method, url: req.originalUrl, status: res.statusCode, duration },
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });

  next();
};
