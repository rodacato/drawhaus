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
import { AcceptInviteUseCase } from "../../application/use-cases/auth/accept-invite";
import { ForgotPasswordUseCase } from "../../application/use-cases/auth/forgot-password";
import { ResetPasswordUseCase } from "../../application/use-cases/auth/reset-password";
import { DeleteAccountUseCase } from "../../application/use-cases/auth/delete-account";
import { GoogleAuthUseCase } from "../../application/use-cases/auth/google-auth";
import { GitHubAuthUseCase } from "../../application/use-cases/auth/github-auth";
import { UnlinkOAuthUseCase } from "../../application/use-cases/auth/unlink-oauth";
import { InMemoryWorkspaceRepository } from "../fakes/in-memory-workspace-repository";
import { createAuthRoutes } from "../../infrastructure/http/routes/auth.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryPasswordResetRepository } from "../fakes/in-memory-password-reset-repository";
import { InMemoryOAuthTokenRepository } from "../fakes/in-memory-oauth-token-repository";
import { NoopEmailService } from "../fakes/noop-email-service";
import { FakeHasher } from "../fakes/fake-hasher";
import { NoopAuditLogger } from "../fakes/noop-audit-logger";

let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;

function createApp() {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
  const hasher = new FakeHasher();

  const register = new RegisterUseCase(users, sessions, hasher);
  const audit = new NoopAuditLogger();
  const login = new LoginUseCase(users, sessions, hasher, audit);
  const logout = new LogoutUseCase(sessions);
  const getCurrentUser = new GetCurrentUserUseCase(sessions);
  const updateProfile = new UpdateProfileUseCase(users);
  const changePassword = new ChangePasswordUseCase(users, hasher);
  const invitations = new InMemoryInvitationRepository();
  const passwordResets = new InMemoryPasswordResetRepository();
  const emailService = new NoopEmailService();
  const acceptInvite = new AcceptInviteUseCase(users, sessions, invitations, hasher);
  const forgotPassword = new ForgotPasswordUseCase(users, passwordResets, emailService);
  const resetPassword = new ResetPasswordUseCase(users, sessions, passwordResets, hasher);
  const deleteAccount = new DeleteAccountUseCase(users, hasher, audit, new InMemoryWorkspaceRepository());
  const oauthTokens = new InMemoryOAuthTokenRepository();
  const googleAuth = new GoogleAuthUseCase(users, sessions, oauthTokens);
  const githubAuth = new GitHubAuthUseCase(users, sessions, oauthTokens);
  const unlinkOAuth = new UnlinkOAuthUseCase(users, oauthTokens);
  const requireAuth = createRequireAuth(getCurrentUser);

  const app = express();
  app.use(express.json());
  app.use("/api/auth", createAuthRoutes({ register, login, logout, getCurrentUser, updateProfile, changePassword, acceptInvite, forgotPassword, resetPassword, deleteAccount, googleAuth, githubAuth, unlinkOAuth }, requireAuth));
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

// --- New integration tests ---

test("setup-status returns needsSetup true on fresh app, false after register", async () => {
  const app = createApp();

  const before = await request(app).get("/api/auth/setup-status");
  assert.equal(before.status, 200);
  assert.equal(before.body.needsSetup, true);

  await request(app).post("/api/auth/register").send({
    email: "setup@example.com",
    name: "Setup User",
    password: "password123",
  });

  const after = await request(app).get("/api/auth/setup-status");
  assert.equal(after.status, 200);
  assert.equal(after.body.needsSetup, false);
});

test("login success sets session cookie", async () => {
  const app = createApp();
  await request(app).post("/api/auth/register").send({
    email: "login@example.com",
    name: "Login User",
    password: "password123",
  });

  const res = await request(app).post("/api/auth/login").send({
    email: "login@example.com",
    password: "password123",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, "login@example.com");
  assert.ok(res.headers["set-cookie"]);
  assert.match(res.headers["set-cookie"][0], /drawhaus_session=/);
});

test("update profile changes name", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "profile@example.com",
    name: "Original",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .patch("/api/auth/me")
    .set("Cookie", cookie)
    .send({ name: "Updated" });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.name, "Updated");
});

test("update profile rejects empty body", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "empty@example.com",
    name: "Empty",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .patch("/api/auth/me")
    .set("Cookie", cookie)
    .send({});

  assert.equal(res.status, 400);
});

test("change password succeeds with correct current password", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "chpass@example.com",
    name: "ChPass User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .post("/api/auth/change-password")
    .set("Cookie", cookie)
    .send({ currentPassword: "password123", newPassword: "newpass1234" });

  assert.equal(res.status, 200);
});

test("forgot password always returns 200 for nonexistent email", async () => {
  const app = createApp();
  const res = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "nonexistent@example.com" });

  assert.equal(res.status, 200);
});

test("forgot password with existing user returns 200", async () => {
  const app = createApp();
  await request(app).post("/api/auth/register").send({
    email: "forgot@example.com",
    name: "Forgot User",
    password: "password123",
  });

  const res = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "forgot@example.com" });

  assert.equal(res.status, 200);
});

test("invite resolve with invalid token returns 404", async () => {
  const app = createApp();
  const res = await request(app).get("/api/auth/invite/invalid-token");
  assert.equal(res.status, 404);
});

test("accept invite with invalid token returns 404", async () => {
  const app = createApp();
  const res = await request(app)
    .post("/api/auth/accept-invite")
    .send({ token: "invalid", name: "Test", password: "password123" });

  assert.equal(res.status, 404);
});

test("delete account with correct password", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "delete@example.com",
    name: "Delete User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const deleteRes = await request(app)
    .delete("/api/auth/account")
    .set("Cookie", cookie)
    .send({ password: "password123" });

  assert.equal(deleteRes.status, 200);

  const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
  assert.equal(meRes.status, 401);
});

test("delete account with wrong password returns 401", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "delwrong@example.com",
    name: "Del Wrong",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .delete("/api/auth/account")
    .set("Cookie", cookie)
    .send({ password: "wrong" });

  assert.equal(res.status, 401);
});

test("Google OAuth returns 404 when not configured", async () => {
  const app = createApp();
  const res = await request(app).get("/api/auth/google").redirects(0);
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Google OAuth is not configured");
});

test("GitHub OAuth returns 404 when not configured", async () => {
  const app = createApp();
  const res = await request(app).get("/api/auth/github").redirects(0);
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "GitHub OAuth is not configured");
});

test("Google callback redirects to error on invalid state", async () => {
  const app = createApp();
  const res = await request(app)
    .get("/api/auth/google/callback?code=test&state=bad")
    .redirects(0);

  assert.equal(res.status, 302);
  assert.ok(res.headers.location.includes("login?error=oauth_failed"));
});

test("GitHub callback redirects to error on invalid state", async () => {
  const app = createApp();
  const res = await request(app)
    .get("/api/auth/github/callback?code=test&state=bad")
    .redirects(0);

  assert.equal(res.status, 302);
  assert.ok(res.headers.location.includes("login?error=oauth_failed"));
});

test("link GitHub returns 404 when not configured", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "linkgh@example.com",
    name: "Link GH",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .get("/api/auth/link/github")
    .set("Cookie", cookie)
    .redirects(0);

  assert.equal(res.status, 404);
});

test("link Google returns 404 when not configured", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "linkgoog@example.com",
    name: "Link Google",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .get("/api/auth/link/google")
    .set("Cookie", cookie)
    .redirects(0);

  assert.equal(res.status, 404);
});

test("unlink invalid provider returns 400", async () => {
  const app = createApp();
  const registerRes = await request(app).post("/api/auth/register").send({
    email: "unlink@example.com",
    name: "Unlink User",
    password: "password123",
  });

  const cookie = registerRes.headers["set-cookie"][0].split(";")[0];
  const res = await request(app)
    .delete("/api/auth/link/invalid")
    .set("Cookie", cookie);

  assert.equal(res.status, 400);
});

test("protected routes reject unauthenticated requests", async () => {
  const app = createApp();

  const patchMe = await request(app)
    .patch("/api/auth/me")
    .send({ name: "Nope" });
  assert.equal(patchMe.status, 401);

  const changePass = await request(app)
    .post("/api/auth/change-password")
    .send({ currentPassword: "x", newPassword: "newpass1234" });
  assert.equal(changePass.status, 401);

  const deleteAcc = await request(app)
    .delete("/api/auth/account")
    .send({ password: "x" });
  assert.equal(deleteAcc.status, 401);
});
