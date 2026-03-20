import type { Request, Response, NextFunction } from "express";
import type { AuthedRequest } from "./async-handler";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthedRequest;
  if (!authReq.authUser || authReq.authUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
