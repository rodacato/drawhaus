import type { NextFunction, Request, Response } from "express";
import { parse } from "cookie";
import type { GetCurrentUserUseCase } from "../../../application/use-cases/auth/get-current-user";
import type { AuthedRequest } from "./async-handler";
import { config } from "../../config";

export function createRequireAuth(getCurrentUser: GetCurrentUserUseCase) {
  return async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cookieHeader = req.headers.cookie;
      const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;
      const user = await getCurrentUser.execute(token);
      (req as AuthedRequest).authUser = user;
      next();
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}
