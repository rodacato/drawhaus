import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { hash } from "bcryptjs";
import { authRouter } from "./auth";
import { pool } from "./db";

type User = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
};

type Session = {
  id: string;
  user_id: string;
  expires_at: string;
};

const users = new Map<string, User>();
const sessions = new Map<string, Session>();

const originalQuery = pool.query.bind(pool);

function appWithAuth() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  return app;
}

before(() => {
  (pool as unknown as { query: typeof pool.query }).query = (async (
    text: string,
    params?: unknown[]
  ) => {
    if (text.includes("SELECT 1 FROM users WHERE email = $1")) {
      const email = params?.[0] as string;
      const exists = [...users.values()].some((u) => u.email === email);
      return { rows: [], rowCount: exists ? 1 : 0 } as unknown;
    }

    if (text.includes("INSERT INTO users")) {
      const email = params?.[0] as string;
      const name = params?.[1] as string;
      const passwordHash = params?.[2] as string;
      const id = `user-${users.size + 1}`;
      const user: User = { id, email, name, password_hash: passwordHash };
      users.set(id, user);
      return {
        rows: [{ id: user.id, email: user.email, name: user.name }],
        rowCount: 1,
      } as unknown;
    }

    if (text.startsWith("INSERT INTO sessions")) {
      const token = params?.[0] as string;
      const userId = params?.[1] as string;
      const expiresAt = params?.[2] as string;
      sessions.set(token, { id: token, user_id: userId, expires_at: expiresAt });
      return { rows: [], rowCount: 1 } as unknown;
    }

    if (text.includes("SELECT id, email, name, password_hash FROM users")) {
      const email = params?.[0] as string;
      const user = [...users.values()].find((u) => u.email === email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 } as unknown;
    }

    if (text.includes("FROM sessions s") && text.includes("JOIN users u")) {
      const token = params?.[0] as string;
      const session = sessions.get(token);
      if (!session) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      const user = users.get(session.user_id);
      if (!user) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      return {
        rows: [
          {
            id: session.id,
            user_id: session.user_id,
            expires_at: session.expires_at,
            email: user.email,
            name: user.name,
          },
        ],
        rowCount: 1,
      } as unknown;
    }

    if (text.startsWith("DELETE FROM sessions WHERE id = $1")) {
      const token = params?.[0] as string;
      const existed = sessions.delete(token);
      return { rows: [], rowCount: existed ? 1 : 0 } as unknown;
    }

    throw new Error(`Unexpected query in test: ${text}`);
  }) as typeof pool.query;
});

after(() => {
  (pool as unknown as { query: typeof pool.query }).query = originalQuery;
});

beforeEach(() => {
  users.clear();
  sessions.clear();
});

test("register creates session cookie and returns user", async () => {
  const res = await request(appWithAuth()).post("/api/auth/register").send({
    email: "user@example.com",
    name: "User",
    password: "password123",
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, "user@example.com");
  assert.ok(res.headers["set-cookie"]);
  assert.match(res.headers["set-cookie"][0], /drawhaus_session=/);
});

test("login with invalid credentials returns 401", async () => {
  users.set("user-1", {
    id: "user-1",
    email: "user@example.com",
    name: "User",
    password_hash: await hash("password123", 12),
  });

  const res = await request(appWithAuth()).post("/api/auth/login").send({
    email: "user@example.com",
    password: "wrong-password",
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid email or password");
});

test("me returns user when authenticated", async () => {
  const registerRes = await request(appWithAuth()).post("/api/auth/register").send({
    email: "auth@example.com",
    name: "Auth User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const meRes = await request(appWithAuth()).get("/api/auth/me").set("Cookie", cookie);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, "auth@example.com");
});

test("logout clears session so me becomes unauthorized", async () => {
  const registerRes = await request(appWithAuth()).post("/api/auth/register").send({
    email: "logout@example.com",
    name: "Logout User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const logoutRes = await request(appWithAuth())
    .post("/api/auth/logout")
    .set("Cookie", cookie);

  assert.equal(logoutRes.status, 200);

  const meAfter = await request(appWithAuth()).get("/api/auth/me").set("Cookie", cookie);
  assert.equal(meAfter.status, 401);
});
