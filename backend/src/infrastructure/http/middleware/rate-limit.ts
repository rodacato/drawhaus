import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

const isTest = process.env.NODE_ENV === "test";

const passthrough: RequestHandler = (_req, _res, next) => next();

export const authLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: 60_000,
      max: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many attempts, please try again later" },
    });

export const generalLimiter: RequestHandler = isTest
  ? passthrough
  : rateLimit({
      windowMs: 60_000,
      max: 60,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later" },
    });
