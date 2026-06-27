import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { GoogleAuthUseCase } from "../../../application/use-cases/auth/google-auth";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryOAuthTokenRepository } from "../../fakes/in-memory-oauth-token-repository";
import { InMemorySiteSettingsRepository } from "../../fakes/in-memory-site-settings-repository";
import { GoogleOAuthProvider } from "../../../infrastructure/services/google-oauth-provider";
import { ConflictError, ForbiddenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

type ConfigMut = {
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  frontendUrl: string;
};

const mutableConfig = config as unknown as ConfigMut;

const ORIGINAL_CONFIG = {
  googleClientId: mutableConfig.googleClientId,
  googleClientSecret: mutableConfig.googleClientSecret,
  googleRedirectUri: mutableConfig.googleRedirectUri,
  frontendUrl: mutableConfig.frontendUrl,
};

function setConfig(overrides: Partial<ConfigMut>) {
  Object.assign(mutableConfig, overrides);
}

function restoreConfig() {
  Object.assign(mutableConfig, ORIGINAL_CONFIG);
}

type FetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

type FetchInit = { method?: string; headers?: Record<string, string>; body?: string };
type FetchHandler = (url: string, init?: FetchInit) => FetchResponse | Promise<FetchResponse>;

function installFetchMock(handler: FetchHandler) {
  return mock.method(globalThis, "fetch", async (input: unknown, init?: unknown) => {
    const url = typeof input === "string" ? input : String(input);
    return handler(url, init as FetchInit | undefined) as unknown as Response;
  });
}

function jsonResponse(body: unknown, ok = true, status = 200): FetchResponse {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function textResponse(text: string, ok = false, status = 400): FetchResponse {
  return {
    ok,
    status,
    json: async () => ({}),
    text: async () => text,
  };
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const defaultTokenPayload = {
  access_token: "access-token-abc",
  refresh_token: "refresh-token-xyz",
  expires_in: 3600,
  token_type: "Bearer",
  scope: "openid email profile",
};

const defaultUserInfoPayload = {
  id: "google-user-1",
  email: "newuser@example.com",
  name: "New User",
  picture: "https://lh3.googleusercontent.com/a/avatar1",
};

function defaultFetchHandler(overrides?: {
  token?: Partial<typeof defaultTokenPayload>;
  userInfo?: Partial<typeof defaultUserInfoPayload>;
}): FetchHandler {
  return (url: string) => {
    if (url === TOKEN_URL) {
      return jsonResponse({ ...defaultTokenPayload, ...(overrides?.token ?? {}) });
    }
    if (url === USERINFO_URL) {
      return jsonResponse({ ...defaultUserInfoPayload, ...(overrides?.userInfo ?? {}) });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
}

function setup(opts?: { withSiteSettings?: boolean }) {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const oauthTokens = new InMemoryOAuthTokenRepository();
  const siteSettingsImpl = new InMemorySiteSettingsRepository();
  const provider = new GoogleOAuthProvider();
  const useCase = new GoogleAuthUseCase(users, sessions, oauthTokens, siteSettingsImpl, provider);
  const siteSettings = opts?.withSiteSettings ? siteSettingsImpl : undefined;
  return { users, sessions, oauthTokens, siteSettings, useCase };
}

beforeEach(() => {
  setConfig({
    googleClientId: "client-id-123",
    googleClientSecret: "client-secret-456",
    googleRedirectUri: "https://app.example.com/oauth/google/callback",
    frontendUrl: "https://app.example.com",
  });
});

afterEach(() => {
  mock.restoreAll();
  restoreConfig();
});

describe("GoogleAuthUseCase.isEnabled", () => {
  it("returns true when all three OAuth config values are set", () => {
    const { useCase } = setup();
    assert.equal(useCase.isEnabled, true);
  });

  it("returns false when googleClientId is missing", () => {
    setConfig({ googleClientId: "" });
    const { useCase } = setup();
    assert.equal(useCase.isEnabled, false);
  });

  it("returns false when googleClientSecret is missing", () => {
    setConfig({ googleClientSecret: "" });
    const { useCase } = setup();
    assert.equal(useCase.isEnabled, false);
  });

  it("returns false when googleRedirectUri is missing", () => {
    setConfig({ googleRedirectUri: "" });
    const { useCase } = setup();
    assert.equal(useCase.isEnabled, false);
  });
});

describe("GoogleAuthUseCase.generateStateToken", () => {
  it("returns a 64-char hex string (32 bytes)", () => {
    const { useCase } = setup();
    const token = useCase.generateStateToken();
    assert.equal(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  it("returns a different value on each call", () => {
    const { useCase } = setup();
    const a = useCase.generateStateToken();
    const b = useCase.generateStateToken();
    assert.notEqual(a, b);
  });
});

describe("GoogleAuthUseCase.getAuthorizationUrl", () => {
  it("builds a Google OAuth URL with default scopes", () => {
    const { useCase } = setup();
    const url = new URL(useCase.getAuthorizationUrl("state-token"));

    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(url.searchParams.get("client_id"), "client-id-123");
    assert.equal(url.searchParams.get("redirect_uri"), "https://app.example.com/oauth/google/callback");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("state"), "state-token");
    assert.equal(url.searchParams.get("access_type"), "offline");
    assert.equal(url.searchParams.get("prompt"), "consent");
  });

  it("uses custom scopes when provided, joined by spaces", () => {
    const { useCase } = setup();
    const url = new URL(
      useCase.getAuthorizationUrl("s", ["openid", "email", "https://www.googleapis.com/auth/drive.file"]),
    );
    assert.equal(
      url.searchParams.get("scope"),
      "openid email https://www.googleapis.com/auth/drive.file",
    );
  });
});

describe("GoogleAuthUseCase.handleCallback — happy paths", () => {
  it("creates a new first user and auto-promotes to admin", async () => {
    const { users, sessions, oauthTokens, useCase } = setup();
    installFetchMock(defaultFetchHandler());

    const result = await useCase.handleCallback("auth-code");

    assert.equal(users.store.length, 1);
    const created = users.store[0];
    assert.equal(created.email, "newuser@example.com");
    assert.equal(created.name, "New User");
    assert.equal(created.role, "admin");
    assert.equal(created.googleId, "google-user-1");
    assert.equal(created.passwordHash, null);
    assert.equal(created.avatarUrl, "https://lh3.googleusercontent.com/a/avatar1");

    assert.equal(sessions.sessions.length, 1);
    assert.equal(result.sessionToken, sessions.sessions[0].token);
    assert.equal(result.redirectUrl, "https://app.example.com/dashboard");

    assert.equal(oauthTokens.store.length, 1);
    const token = oauthTokens.store[0];
    assert.equal(token.userId, created.id);
    assert.equal(token.provider, "google");
    assert.equal(token.accessToken, "access-token-abc");
    assert.equal(token.refreshToken, "refresh-token-xyz");
    assert.equal(token.scopes, "openid email profile");
  });

  it("returns existing user looked up by googleId without updating when name and picture are unchanged", async () => {
    const { users, sessions, oauthTokens, useCase } = setup();
    const existing = await users.create({
      email: "stale-email@example.com",
      name: defaultUserInfoPayload.name,
      passwordHash: null,
      googleId: "google-user-1",
      avatarUrl: defaultUserInfoPayload.picture,
    });
    installFetchMock(defaultFetchHandler());

    const result = await useCase.handleCallback("auth-code");

    assert.equal(users.store.length, 1);
    assert.equal(users.store[0].name, defaultUserInfoPayload.name);
    assert.equal(users.store[0].email, "stale-email@example.com");
    assert.equal(users.store[0].avatarUrl, defaultUserInfoPayload.picture);

    assert.equal(sessions.sessions.length, 1);
    assert.equal(sessions.sessions[0].userId, existing.id);
    assert.equal(result.sessionToken, sessions.sessions[0].token);
    assert.equal(oauthTokens.store.length, 1);
    assert.equal(oauthTokens.store[0].userId, existing.id);
  });

  it("syncs name on a returning user when Google reports a fresh display name", async () => {
    const { users, useCase } = setup();
    const existing = await users.create({
      email: "user@example.com",
      name: "Stale Name",
      passwordHash: null,
      googleId: "google-user-1",
      avatarUrl: defaultUserInfoPayload.picture,
    });
    installFetchMock(defaultFetchHandler({ userInfo: { name: "Fresh Name From Google" } }));

    await useCase.handleCallback("auth-code");

    const after = users.store.find((u) => u.id === existing.id);
    assert.ok(after);
    assert.equal(after.name, "Fresh Name From Google");
    assert.equal(after.avatarUrl, defaultUserInfoPayload.picture);
  });

  it("syncs avatarUrl on a returning user when Google reports a fresh picture", async () => {
    const { users, useCase } = setup();
    const existing = await users.create({
      email: "user@example.com",
      name: defaultUserInfoPayload.name,
      passwordHash: null,
      googleId: "google-user-1",
      avatarUrl: "https://lh3.googleusercontent.com/a/old-avatar",
    });
    installFetchMock(
      defaultFetchHandler({ userInfo: { picture: "https://lh3.googleusercontent.com/a/new-avatar" } }),
    );

    await useCase.handleCallback("auth-code");

    const after = users.store.find((u) => u.id === existing.id);
    assert.ok(after);
    assert.equal(after.avatarUrl, "https://lh3.googleusercontent.com/a/new-avatar");
  });

  it("preserves existing avatarUrl when Google returns no picture (does not clear)", async () => {
    const { users, useCase } = setup();
    const existing = await users.create({
      email: "user@example.com",
      name: defaultUserInfoPayload.name,
      passwordHash: null,
      googleId: "google-user-1",
      avatarUrl: "https://existing.example.com/avatar.png",
    });
    installFetchMock(
      (url) => {
        if (url === TOKEN_URL) return jsonResponse(defaultTokenPayload);
        if (url === USERINFO_URL) {
          return jsonResponse({
            id: defaultUserInfoPayload.id,
            email: defaultUserInfoPayload.email,
            name: defaultUserInfoPayload.name,
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      },
    );

    await useCase.handleCallback("auth-code");

    const after = users.store.find((u) => u.id === existing.id);
    assert.ok(after);
    assert.equal(after.avatarUrl, "https://existing.example.com/avatar.png");
  });

  it("throws ConflictError when an existing local account shares the email and has no googleId (prevents silent takeover)", async () => {
    const { users, sessions, oauthTokens, useCase } = setup();
    const existing = await users.create({
      email: "newuser@example.com",
      name: "Existing User",
      passwordHash: "hash",
      avatarUrl: "https://existing.example.com/avatar.png",
    });
    installFetchMock(defaultFetchHandler());

    await assert.rejects(
      () => useCase.handleCallback("auth-code"),
      (err: unknown) => err instanceof ConflictError,
    );

    const untouched = users.store.find((u) => u.id === existing.id);
    assert.ok(untouched);
    assert.equal(untouched.googleId, null);
    assert.equal(untouched.avatarUrl, "https://existing.example.com/avatar.png");
    assert.equal(oauthTokens.store.length, 0);
    assert.equal(sessions.sessions.length, 0);
  });

  it("creates new user with passwordHash=null when not first user and registration is open", async () => {
    const { users, useCase } = setup({ withSiteSettings: true });
    await users.create({
      email: "seed-admin@example.com",
      name: "Seed",
      passwordHash: "hash",
    });
    installFetchMock(defaultFetchHandler());

    await useCase.handleCallback("auth-code");

    assert.equal(users.store.length, 2);
    const created = users.store.find((u) => u.email === "newuser@example.com");
    assert.ok(created);
    assert.equal(created.passwordHash, null);
    assert.equal(created.role, "user");
    assert.equal(created.googleId, "google-user-1");
  });

  it("lowercases the email returned from Google before the email-collision check (still throws ConflictError)", async () => {
    const { users, useCase } = setup();
    await users.create({
      email: "case-test@example.com",
      name: "Lower",
      passwordHash: "hash",
    });
    installFetchMock(
      defaultFetchHandler({ userInfo: { email: "Case-Test@Example.COM", id: "g-case" } }),
    );

    await assert.rejects(
      () => useCase.handleCallback("auth-code"),
      (err: unknown) => err instanceof ConflictError,
    );

    assert.equal(users.store.length, 1, "should not create a second user");
    assert.equal(users.store[0].googleId, null, "should not link Google to existing account");
  });

  it("computes tokenExpiresAt from the expires_in field", async () => {
    const { oauthTokens, useCase } = setup();
    const before = Date.now();
    installFetchMock(defaultFetchHandler({ token: { expires_in: 7200 } }));

    await useCase.handleCallback("auth-code");

    const after = Date.now();
    const expires = oauthTokens.store[0].tokenExpiresAt;
    assert.ok(expires);
    const expiresMs = expires.getTime();
    assert.ok(expiresMs >= before + 7200 * 1000, "expiry must be at least before+7200s");
    assert.ok(expiresMs <= after + 7200 * 1000, "expiry must be at most after+7200s");
  });

  it("posts the auth code to the Google token endpoint with correct grant_type", async () => {
    const { useCase } = setup();
    const fetchMock = installFetchMock(defaultFetchHandler());

    await useCase.handleCallback("auth-code-xyz");

    const tokenCall = fetchMock.mock.calls.find((c) => (c.arguments[0] as string) === TOKEN_URL);
    assert.ok(tokenCall);
    const init = tokenCall.arguments[1] as FetchInit;
    assert.equal(init.method, "POST");
    const body = new URLSearchParams(init.body as string);
    assert.equal(body.get("code"), "auth-code-xyz");
    assert.equal(body.get("grant_type"), "authorization_code");
    assert.equal(body.get("client_id"), "client-id-123");
    assert.equal(body.get("client_secret"), "client-secret-456");
  });
});

describe("GoogleAuthUseCase.handleCallback — sad paths", () => {
  it("throws ForbiddenError when the resolved user is disabled", async () => {
    const { users, useCase } = setup();
    const existing = await users.create({
      email: "disabled@example.com",
      name: "Disabled",
      passwordHash: null,
      googleId: "google-user-1",
    });
    await users.adminUpdate(existing.id, { disabled: true });
    installFetchMock(defaultFetchHandler());

    await assert.rejects(
      () => useCase.handleCallback("code"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("throws ForbiddenError when registration is closed and user is not first", async () => {
    const { users, siteSettings, useCase } = setup({ withSiteSettings: true });
    await users.create({ email: "seed@example.com", name: "Seed", passwordHash: "h" });
    assert.ok(siteSettings);
    await siteSettings.update({ registrationOpen: false });
    installFetchMock(defaultFetchHandler());

    await assert.rejects(
      () => useCase.handleCallback("code"),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("allows first user creation even when registration is closed", async () => {
    const { users, siteSettings, useCase } = setup({ withSiteSettings: true });
    assert.ok(siteSettings);
    await siteSettings.update({ registrationOpen: false });
    installFetchMock(defaultFetchHandler());

    await useCase.handleCallback("code");

    assert.equal(users.store.length, 1);
    assert.equal(users.store[0].role, "admin");
  });

  it("throws when the token exchange returns a non-2xx response", async () => {
    const { useCase } = setup();
    installFetchMock((url) => {
      if (url === TOKEN_URL) return textResponse("invalid_grant", false, 400);
      throw new Error(`Unexpected: ${url}`);
    });

    await assert.rejects(
      () => useCase.handleCallback("bad-code"),
      (err: unknown) => err instanceof Error && /Google token exchange failed/.test(err.message),
    );
  });

  it("throws when fetchUserInfo returns a non-2xx response", async () => {
    const { useCase } = setup();
    installFetchMock((url) => {
      if (url === TOKEN_URL) return jsonResponse(defaultTokenPayload);
      if (url === USERINFO_URL) return textResponse("unauthorized", false, 401);
      throw new Error(`Unexpected: ${url}`);
    });

    await assert.rejects(
      () => useCase.handleCallback("code"),
      (err: unknown) => err instanceof Error && /Failed to fetch Google user info/.test(err.message),
    );
  });
});

describe("GoogleAuthUseCase.handleLinkCallback", () => {
  it("links Google account to the requesting user and stores oauth token", async () => {
    const { users, oauthTokens, useCase } = setup();
    const user = await users.create({
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "h",
    });
    installFetchMock(defaultFetchHandler());

    await useCase.handleLinkCallback("code", user.id);

    const updated = users.store.find((u) => u.id === user.id);
    assert.ok(updated);
    assert.equal(updated.googleId, "google-user-1");
    assert.equal(updated.avatarUrl, "https://lh3.googleusercontent.com/a/avatar1");

    assert.equal(oauthTokens.store.length, 1);
    const token = oauthTokens.store[0];
    assert.equal(token.userId, user.id);
    assert.equal(token.provider, "google");
    assert.equal(token.refreshToken, "refresh-token-xyz");
  });

  it("preserves existing avatar when user already has one", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "h",
      avatarUrl: "https://existing.example.com/me.png",
    });
    installFetchMock(defaultFetchHandler());

    await useCase.handleLinkCallback("code", user.id);

    const updated = users.store.find((u) => u.id === user.id);
    assert.ok(updated);
    assert.equal(updated.avatarUrl, "https://existing.example.com/me.png");
  });

  it("throws when the Google account is already linked to a different user", async () => {
    const { users, oauthTokens, useCase } = setup();
    await users.create({
      email: "other@example.com",
      name: "Other",
      passwordHash: "h",
      googleId: "google-user-1",
    });
    const me = await users.create({
      email: "me@example.com",
      name: "Me",
      passwordHash: "h",
    });
    installFetchMock(defaultFetchHandler());

    await assert.rejects(
      () => useCase.handleLinkCallback("code", me.id),
      (err: unknown) =>
        err instanceof Error && /already linked to another user/.test(err.message),
    );
    assert.equal(oauthTokens.store.length, 0, "oauth token must not be stored on conflict");
    assert.equal(users.store.find((u) => u.id === me.id)?.googleId, null);
  });

  it("succeeds when the same user re-links their already-linked Google account", async () => {
    const { users, oauthTokens, useCase } = setup();
    const me = await users.create({
      email: "me@example.com",
      name: "Me",
      passwordHash: "h",
      googleId: "google-user-1",
    });
    installFetchMock(defaultFetchHandler());

    await useCase.handleLinkCallback("code", me.id);

    assert.equal(oauthTokens.store.length, 1);
    assert.equal(oauthTokens.store[0].userId, me.id);
  });
});

describe("GoogleAuthUseCase.handleDriveCallback", () => {
  it("stores the oauth token without touching the user record", async () => {
    const { users, oauthTokens, useCase } = setup();
    const user = await users.create({
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "h",
    });
    const userSnapshotBefore = { ...user };
    installFetchMock(defaultFetchHandler({ token: { scope: "https://www.googleapis.com/auth/drive.file" } }));

    await useCase.handleDriveCallback("code", user.id);

    assert.equal(oauthTokens.store.length, 1);
    const token = oauthTokens.store[0];
    assert.equal(token.userId, user.id);
    assert.equal(token.provider, "google");
    assert.equal(token.accessToken, "access-token-abc");
    assert.equal(token.refreshToken, "refresh-token-xyz");
    assert.equal(token.scopes, "https://www.googleapis.com/auth/drive.file");

    const after = users.store.find((u) => u.id === user.id);
    assert.ok(after);
    assert.equal(after.googleId, userSnapshotBefore.googleId);
    assert.equal(after.avatarUrl, userSnapshotBefore.avatarUrl);
    assert.equal(after.email, userSnapshotBefore.email);
  });

  it("computes tokenExpiresAt from the expires_in field", async () => {
    const { users, oauthTokens, useCase } = setup();
    const user = await users.create({
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "h",
    });
    const before = Date.now();
    installFetchMock(defaultFetchHandler({ token: { expires_in: 1800 } }));

    await useCase.handleDriveCallback("code", user.id);

    const after = Date.now();
    const expires = oauthTokens.store[0].tokenExpiresAt;
    assert.ok(expires);
    const expiresMs = expires.getTime();
    assert.ok(expiresMs >= before + 1800 * 1000);
    assert.ok(expiresMs <= after + 1800 * 1000);
  });

  it("does NOT fetch userinfo (drive flow skips identity check)", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "h",
    });
    const fetchMock = installFetchMock((url) => {
      if (url === TOKEN_URL) return jsonResponse(defaultTokenPayload);
      throw new Error(`Drive flow should not call ${url}`);
    });

    await useCase.handleDriveCallback("code", user.id);

    const userInfoCalls = fetchMock.mock.calls.filter(
      (c) => (c.arguments[0] as string) === USERINFO_URL,
    );
    assert.equal(userInfoCalls.length, 0);
  });
});
