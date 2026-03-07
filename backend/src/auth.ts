import crypto from "crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import { compare, hash } from "bcryptjs";
import { parse } from "cookie";
import { z } from "zod";
import { pool } from "./db";

const COOKIE_NAME = "drawhaus_session";
const SESSION_TTL_DAYS = 30;

type UserRow = {
  id: string;
  email: string;
  name: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  email: string;
  name: string;
};

const registerSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
});

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<Response | void>
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error: unknown) => {
      console.error("Auth route failed", error);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function getSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const parsedCookies = parse(cookieHeader);
  return parsedCookies[COOKIE_NAME] ?? null;
}

function sessionExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = sessionExpiresAt();

  await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
    token,
    userId,
    expiresAt.toISOString(),
  ]);

  return token;
}

async function getUserFromSession(token: string): Promise<UserRow | null> {
  const { rows } = await pool.query<SessionRow>(
    `
      SELECT s.id, s.user_id, s.expires_at, u.email, u.name
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [token]
  );

  const session = rows[0];
  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await pool.query("DELETE FROM sessions WHERE id = $1", [token]);
    return null;
  }

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
  };
}

export const authRouter = Router();

authRouter.post("/register", asyncRoute(async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const email = parsed.data.email.toLowerCase();
  const { name, password } = parsed.data;

  const existing = await pool.query("SELECT 1 FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await hash(password, 12);
  const { rows } = await pool.query<UserRow>(
    `
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name
    `,
    [email, name, passwordHash]
  );

  const user = rows[0];
  const token = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, getCookieOptions());

  return res.status(201).json({ user });
}));

authRouter.post("/login", asyncRoute(async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const email = parsed.data.email.toLowerCase();
  const { password } = parsed.data;
  const { rows } = await pool.query<
    UserRow & {
      password_hash: string;
    }
  >("SELECT id, email, name, password_hash FROM users WHERE email = $1 LIMIT 1", [email]);

  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const passwordIsValid = await compare(password, user.password_hash);
  if (!passwordIsValid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, getCookieOptions());

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}));

authRouter.post("/logout", asyncRoute(async (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) {
    await pool.query("DELETE FROM sessions WHERE id = $1", [token]);
  }

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res.status(200).json({ success: true });
}));

authRouter.get("/me", asyncRoute(async (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await getUserFromSession(token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({ user });
}));
