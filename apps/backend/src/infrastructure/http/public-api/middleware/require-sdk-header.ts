import type { Request, Response, NextFunction } from "express";

export function requireSdkHeader(req: Request, res: Response, next: NextFunction): void {
  const clientHeader = req.headers["x-drawhaus-client"];
  if (!clientHeader) {
    res.status(400).json({ error: "Missing X-Drawhaus-Client header" });
    return;
  }
  next();
}
