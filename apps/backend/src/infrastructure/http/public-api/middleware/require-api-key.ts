import type { Request, Response, NextFunction } from "express";
import type { ValidateApiKeyUseCase } from "../../../../application/use-cases/api-keys/validate-api-key";
import type { UserRole } from "../../../../domain/entities/user";

export type ApiKeyAuthedRequest = Request & {
  authUser: { id: string; email: string; name: string; role: UserRole; disabled: boolean };
  apiKeyWorkspaceId: string;
  apiKeyId: string;
};

export function createRequireApiKey(validateApiKey: ValidateApiKeyUseCase) {
  return async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const rawKey = authHeader.slice(7);
    if (!rawKey.startsWith("dhk_")) {
      res.status(401).json({ error: "Invalid API key format" });
      return;
    }

    try {
      const result = await validateApiKey.execute(rawKey);

      (req as ApiKeyAuthedRequest).authUser = result.user;
      (req as ApiKeyAuthedRequest).apiKeyWorkspaceId = result.workspaceId;
      (req as ApiKeyAuthedRequest).apiKeyId = result.apiKeyId;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired API key" });
    }
  };
}
