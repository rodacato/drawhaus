import type { RequestHandler } from "express";
import { randomUUID } from "crypto";
import { logger } from "../../logger";

export const requestId: RequestHandler = (req, res, next) => {
  const id = (req.headers["x-request-id"] as string) ?? randomUUID();
  req.id = id;
  req.log = logger.child({ requestId: id });
  res.setHeader("X-Request-Id", id);
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      log: typeof logger;
    }
  }
}
