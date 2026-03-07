import type { NextFunction, Request, Response } from "express";
import { getSessionToken, getUserFromSession } from "./session";

export type AuthedRequest = Request & {
  authUser: {
    id: string;
    email: string;
    name: string;
  };
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getSessionToken(req.headers.cookie);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await getUserFromSession(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    (req as AuthedRequest).authUser = user;
    next();
  } catch (error: unknown) {
    console.error("Auth middleware failed", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
