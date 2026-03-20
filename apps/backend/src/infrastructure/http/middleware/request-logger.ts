import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
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
