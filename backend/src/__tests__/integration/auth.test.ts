import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { RegisterUseCase } from "../../application/use-cases/auth/register";
import { LoginUseCase } from "../../application/use-cases/auth/login";
import { LogoutUseCase } from "../../application/use-cases/auth/logout";
import { GetCurrentUserUseCase } from "../../application/use-cases/auth/get-current-user";
import { UpdateProfileUseCase } from "../../application/use-cases/auth/update-profile";
import { ChangePasswordUseCase } from "../../application/use-cases/auth/change-password";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { FakeHasher } from "../fakes/fake-hasher";

let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;

function createApp() {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
  const hasher = new FakeHasher();

  const register = new RegisterUseCase(users, sessions, hasher);
  const login = new LoginUseCase(users, sessions, hasher);
  const logout = new LogoutUseCase(sessions);
  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const updateProfile = new UpdateProfileUseCase(users);
  const changePassword = new ChangePasswordUseCase(users, hasher);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());
  app.use("/api/auth", createAuthRoutes({ register, login, logout, getCurrentUser, updateProfile, changePassword }, requireAuth));
  return app;
}

beforeEach(() => {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
});

test("register creates session cookie and returns user", async () => {
  const app = createApp();
  const res = await request(app).post("/api/auth/register").send({
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
  const app = createApp();
  // Register first
  await request(app).post("/api/auth/register").send({
    email: "user@example.com",
    name: "User",
    password: "password123",
  });

  const res = await request(app).post("/api/auth/login").send({
    email: "user@example.com",
    password: "wrong-password",
  });

  assert.equal(res.status, 401);
});

test("me returns user when authenticated", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "auth@example.com",
    name: "Auth User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, "auth@example.com");
});

test("logout clears session so me becomes unauthorized", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "logout@example.com",
    name: "Logout User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
  assert.equal(logoutRes.status, 200);

  const meAfter = await request(app).get("/api/auth/me").set("Cookie", cookie);
  assert.equal(meAfter.status, 401);
});
