import type { Request, Response, NextFunction } from "express";
import type { ApiKeyRepository } from "../../../../domain/ports/api-key-repository";
import type { ApiKeyAuthedRequest } from "./require-api-key";

export function createLogApiRequest(apiKeyRepo: ApiKeyRepository) {
  return function logApiRequest(req: Request, res: Response, next: NextFunction): void {
    res.on("finish", () => {
      const authedReq = req as ApiKeyAuthedRequest;
      if (!authedReq.apiKeyId) return;

      apiKeyRepo.logRequest({
        keyId: authedReq.apiKeyId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      });
    });
    next();
  };
}
