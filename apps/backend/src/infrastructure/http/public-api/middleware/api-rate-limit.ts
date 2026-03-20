import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

const isTest = process.env.NODE_ENV === "test";

const passthrough: RequestHandler = (_req, _res, next) => next();

export const apiKeyRateLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: 60_000,
      max: 60,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      keyGenerator: (req) => req.headers.authorization ?? req.ip ?? "unknown",
      message: { error: "Rate limit exceeded. Maximum 60 requests per minute per API key" },
    });
