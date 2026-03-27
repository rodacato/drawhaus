import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { RedisStore } from "rate-limit-redis";
import type { Redis } from "ioredis";

const isTest = process.env.NODE_ENV === "test";

const passthrough: RequestHandler = (_req, _res, next) => next();

function createApiLimiter(redisClient?: Redis): RequestHandler {
  if (isTest) return passthrough;
  return rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => req.headers.authorization ?? req.ip ?? "unknown",
    message: { error: "Rate limit exceeded. Maximum 60 requests per minute per API key" },
    ...(redisClient ? { store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as Promise<number | string>, prefix: "rl:api:" }) } : {}),
  });
}

let _apiHandler = createApiLimiter();

// Stable wrapper reference for app.use()
export const apiKeyRateLimiter: RequestHandler = (req, res, next) => _apiHandler(req, res, next);

/** Call after Redis connects to upgrade to shared Redis store */
export function upgradeApiRateLimiter(redisClient: Redis): void {
  if (isTest) return;
  _apiHandler = createApiLimiter(redisClient);
}
