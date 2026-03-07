import crypto from "crypto";
import { parse } from "cookie";
import { pool } from "./db";

export const COOKIE_NAME = "drawhaus_session";
const SESSION_TTL_DAYS = 30;

export type AuthUser = {
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

function sessionExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function getSessionToken(cookieHeader?: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  const parsedCookies = parse(cookieHeader);
  return parsedCookies[COOKIE_NAME] ?? null;
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = sessionExpiresAt();

  await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [
    token,
    userId,
    expiresAt.toISOString(),
  ]);

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE id = $1", [token]);
}

export async function getUserFromSession(token: string): Promise<AuthUser | null> {
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
    await deleteSession(token);
    return null;
  }

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
  };
}
