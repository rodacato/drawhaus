import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { RedisStore } from "rate-limit-redis";
import type { Redis } from "ioredis";

const isTest = process.env.NODE_ENV === "test";

const passthrough: RequestHandler = (_req, _res, next) => next();

function createLimiter(windowMs: number, max: number, message: string, prefix: string, redisClient?: Redis): RequestHandler {
  if (isTest) return passthrough;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: message },
    ...(redisClient ? { store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as Promise<number | string>, prefix: `rl:${prefix}:` }) } : {}),
  });
}

// Mutable inner handlers — swapped when Redis connects
let _authHandler = createLimiter(60_000, 5, "Too many attempts, please try again later", "auth");
let _generalHandler = createLimiter(60_000, 60, "Too many requests, please try again later", "general");

// Stable wrapper references for app.use()
export const authLimiter: RequestHandler = (req, res, next) => _authHandler(req, res, next);
export const generalLimiter: RequestHandler = (req, res, next) => _generalHandler(req, res, next);

/** Call after Redis connects to upgrade limiters to shared Redis store */
export function upgradeRateLimiters(redisClient: Redis): void {
  if (isTest) return;
  _authHandler = createLimiter(60_000, 5, "Too many attempts, please try again later", "auth", redisClient);
  _generalHandler = createLimiter(60_000, 60, "Too many requests, please try again later", "general", redisClient);
}
