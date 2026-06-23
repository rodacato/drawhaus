import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { GitHubAuthUseCase } from "../../../application/use-cases/auth/github-auth";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryOAuthTokenRepository } from "../../fakes/in-memory-oauth-token-repository";
import { InMemorySiteSettingsRepository } from "../../fakes/in-memory-site-settings-repository";
import { ForbiddenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type FetchHandler = (url: string, init?: FetchInit) => unknown;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

function installFetchMock(handler: FetchHandler) {
  return mock.method(globalThis, "fetch", async (input: FetchInput, init?: FetchInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const result = await handler(url, init);
    return result as Response;
  });
}

const ORIGINAL_CONFIG = {
  githubClientId: config.githubClientId,
  githubClientSecret: config.githubClientSecret,
  githubRedirectUri: config.githubRedirectUri,
  frontendUrl: config.frontendUrl,
};

function setOAuthConfig(values: {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  frontendUrl?: string;
}) {
  const mutable = config as unknown as Record<string, string>;
  if (values.clientId !== undefined) mutable.githubClientId = values.clientId;
  if (values.clientSecret !== undefined) mutable.githubClientSecret = values.clientSecret;
  if (values.redirectUri !== undefined) mutable.githubRedirectUri = values.redirectUri;
  if (values.frontendUrl !== undefined) mutable.frontendUrl = values.frontendUrl;
}

function restoreConfig() {
  const mutable = config as unknown as Record<string, string>;
  mutable.githubClientId = ORIGINAL_CONFIG.githubClientId;
  mutable.githubClientSecret = ORIGINAL_CONFIG.githubClientSecret;
  mutable.githubRedirectUri = ORIGINAL_CONFIG.githubRedirectUri;
  mutable.frontendUrl = ORIGINAL_CONFIG.frontendUrl;
}

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const oauthTokens = new InMemoryOAuthTokenRepository();
  const siteSettings = new InMemorySiteSettingsRepository();
  const useCase = new GitHubAuthUseCase(users, sessions, oauthTokens, siteSettings);
  return { users, sessions, oauthTokens, siteSettings, useCase };
}

const DEFAULT_TOKEN_RESPONSE = {
  access_token: "gho_test_token",
  token_type: "bearer",
  scope: "read:user,user:email",
};

const DEFAULT_GITHUB_USER = {
  id: 12345,
  login: "octocat",
  name: "Octo Cat",
  email: "octo@example.com",
  avatar_url: "https://avatars.githubusercontent.com/u/12345",
};

function buildHandler(overrides: {
  token?: unknown;
  tokenStatus?: number;
  user?: unknown;
  userStatus?: number;
  emails?: unknown;
  emailsStatus?: number;
} = {}): FetchHandler {
  return (url) => {
    if (url.startsWith("https://github.com/login/oauth/access_token")) {
      const body = overrides.token ?? DEFAULT_TOKEN_RESPONSE;
      const status = overrides.tokenStatus ?? 200;
      if (status >= 400 && typeof body === "string") return textResponse(body, status);
      return jsonResponse(body, status);
    }
    if (url === "https://api.github.com/user") {
      const body = overrides.user ?? DEFAULT_GITHUB_USER;
      const status = overrides.userStatus ?? 200;
      return jsonResponse(body, status);
    }
    if (url === "https://api.github.com/user/emails") {
      const body = overrides.emails ?? [
        { email: "octo@example.com", primary: true, verified: true },
      ];
      const status = overrides.emailsStatus ?? 200;
      return jsonResponse(body, status);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
}

describe("GitHubAuthUseCase", () => {
  afterEach(() => {
    mock.restoreAll();
    restoreConfig();
  });

  describe("isEnabled", () => {
    it("returns true when all GitHub OAuth env vars are set", () => {
      setOAuthConfig({
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "https://app.test/callback",
      });
      const { useCase } = setup();
      assert.equal(useCase.isEnabled, true);
    });

    it("returns false when client id is missing", () => {
      setOAuthConfig({ clientId: "", clientSecret: "s", redirectUri: "r" });
      const { useCase } = setup();
      assert.equal(useCase.isEnabled, false);
    });

    it("returns false when client secret is missing", () => {
      setOAuthConfig({ clientId: "id", clientSecret: "", redirectUri: "r" });
      const { useCase } = setup();
      assert.equal(useCase.isEnabled, false);
    });

    it("returns false when redirect uri is missing", () => {
      setOAuthConfig({ clientId: "id", clientSecret: "s", redirectUri: "" });
      const { useCase } = setup();
      assert.equal(useCase.isEnabled, false);
    });
  });

  describe("generateStateToken", () => {
    it("returns a 64-character hex string", () => {
      const { useCase } = setup();
      const token = useCase.generateStateToken();
      assert.equal(token.length, 64);
      assert.match(token, /^[0-9a-f]{64}$/);
    });

    it("returns different tokens on each call", () => {
      const { useCase } = setup();
      const a = useCase.generateStateToken();
      const b = useCase.generateStateToken();
      assert.notEqual(a, b);
    });
  });

  describe("getAuthorizationUrl", () => {
    it("builds a GitHub authorize URL with required params", () => {
      setOAuthConfig({
        clientId: "my-client-id",
        clientSecret: "secret",
        redirectUri: "https://app.test/auth/github/callback",
      });
      const { useCase } = setup();
      const url = useCase.getAuthorizationUrl("state-abc");
      const parsed = new URL(url);
      assert.equal(parsed.origin, "https://github.com");
      assert.equal(parsed.pathname, "/login/oauth/authorize");
      assert.equal(parsed.searchParams.get("client_id"), "my-client-id");
      assert.equal(parsed.searchParams.get("redirect_uri"), "https://app.test/auth/github/callback");
      assert.equal(parsed.searchParams.get("scope"), "read:user user:email");
      assert.equal(parsed.searchParams.get("state"), "state-abc");
    });
  });

  describe("handleCallback - happy paths", () => {
    beforeEach(() => {
      setOAuthConfig({
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "https://app.test/cb",
        frontendUrl: "https://app.test",
      });
    });

    it("creates the first user and promotes them to admin", async () => {
      installFetchMock(buildHandler());
      const { users, sessions, oauthTokens, useCase } = setup();

      const result = await useCase.handleCallback("code123");

      assert.equal(users.store.length, 1);
      const created = users.store[0];
      assert.equal(created.email, "octo@example.com");
      assert.equal(created.name, "Octo Cat");
      assert.equal(created.passwordHash, null);
      assert.equal(created.githubId, "12345");
      assert.equal(created.githubUsername, "octocat");
      assert.equal(created.avatarUrl, "https://avatars.githubusercontent.com/u/12345");
      assert.equal(created.role, "admin");
      assert.equal(sessions.sessions.length, 1);
      assert.equal(result.sessionToken, sessions.sessions[0].token);
      assert.equal(result.redirectUrl, "https://app.test/dashboard");
      assert.equal(oauthTokens.store.length, 1);
      assert.equal(oauthTokens.store[0].provider, "github");
      assert.equal(oauthTokens.store[0].accessToken, "gho_test_token");
      assert.equal(oauthTokens.store[0].refreshToken, null);
      assert.equal(oauthTokens.store[0].scopes, "read:user,user:email");
    });

    it("returns existing user found by githubId without modifying it when username unchanged", async () => {
      installFetchMock(buildHandler());
      const { users, useCase } = setup();
      const existing = await users.create({
        email: "octo@example.com",
        name: "Octo Cat",
        passwordHash: null,
        githubId: "12345",
        githubUsername: "octocat",
        avatarUrl: "https://avatars/old",
      });

      await useCase.handleCallback("code");

      assert.equal(users.store.length, 1);
      assert.equal(users.store[0].id, existing.id);
      assert.equal(users.store[0].githubUsername, "octocat");
      assert.equal(users.store[0].avatarUrl, "https://avatars/old");
    });

    it("updates githubUsername when GitHub login changed for an existing githubId match", async () => {
      installFetchMock(buildHandler());
      const { users, useCase } = setup();
      await users.create({
        email: "octo@example.com",
        name: "Octo",
        passwordHash: null,
        githubId: "12345",
        githubUsername: "old-handle",
      });

      await useCase.handleCallback("code");

      assert.equal(users.store[0].githubUsername, "octocat");
    });

    it("links GitHub to an existing user found by email and preserves existing avatar", async () => {
      installFetchMock(buildHandler());
      const { users, oauthTokens, useCase } = setup();
      const existing = await users.create({
        email: "octo@example.com",
        name: "Octo",
        passwordHash: "hashed",
        avatarUrl: "https://existing-avatar",
      });

      await useCase.handleCallback("code");

      assert.equal(users.store.length, 1);
      assert.equal(users.store[0].id, existing.id);
      assert.equal(users.store[0].githubId, "12345");
      assert.equal(users.store[0].githubUsername, "octocat");
      assert.equal(users.store[0].avatarUrl, "https://existing-avatar");
      assert.equal(oauthTokens.store[0].userId, existing.id);
    });

    it("uses the GitHub avatar when linking by email if user has no avatar yet", async () => {
      installFetchMock(buildHandler());
      const { users, useCase } = setup();
      await users.create({
        email: "octo@example.com",
        name: "Octo",
        passwordHash: "hashed",
      });

      await useCase.handleCallback("code");

      assert.equal(users.store[0].avatarUrl, "https://avatars.githubusercontent.com/u/12345");
    });

    it("creates a new non-first user with passwordHash=null when registration is open", async () => {
      installFetchMock(buildHandler());
      const { users, useCase } = setup();
      await users.create({
        email: "first@example.com",
        name: "First",
        passwordHash: "hashed",
      });

      await useCase.handleCallback("code");

      assert.equal(users.store.length, 2);
      const created = users.store[1];
      assert.equal(created.email, "octo@example.com");
      assert.equal(created.passwordHash, null);
      assert.equal(created.role, "user");
    });

    it("falls back to GitHub login as name when GitHub profile name is null", async () => {
      installFetchMock(
        buildHandler({
          user: { ...DEFAULT_GITHUB_USER, name: null },
        }),
      );
      const { users, useCase } = setup();

      await useCase.handleCallback("code");

      assert.equal(users.store[0].name, "octocat");
    });

    it("resolves email via /user/emails when GitHub profile email is null", async () => {
      installFetchMock(
        buildHandler({
          user: { ...DEFAULT_GITHUB_USER, email: null },
          emails: [
            { email: "other@example.com", primary: false, verified: true },
            { email: "primary@example.com", primary: true, verified: true },
          ],
        }),
      );
      const { users, useCase } = setup();

      await useCase.handleCallback("code");

      assert.equal(users.store[0].email, "primary@example.com");
    });

    it("lowercases email when creating the user", async () => {
      installFetchMock(
        buildHandler({
          user: { ...DEFAULT_GITHUB_USER, email: "MiXeD@Example.COM" },
        }),
      );
      const { users, useCase } = setup();

      await useCase.handleCallback("code");

      assert.equal(users.store[0].email, "mixed@example.com");
    });
  });

  describe("handleCallback - sad paths", () => {
    beforeEach(() => {
      setOAuthConfig({
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "https://app.test/cb",
        frontendUrl: "https://app.test",
      });
    });

    it("throws ForbiddenError when an existing user is disabled", async () => {
      installFetchMock(buildHandler());
      const { users, useCase } = setup();
      const existing = await users.create({
        email: "octo@example.com",
        name: "Octo",
        passwordHash: null,
        githubId: "12345",
        githubUsername: "octocat",
      });
      await users.adminUpdate(existing.id, { disabled: true });

      await assert.rejects(
        () => useCase.handleCallback("code"),
        (err: unknown) => err instanceof ForbiddenError,
      );
    });

    it("throws ForbiddenError when registration is closed for a brand-new non-first user", async () => {
      installFetchMock(buildHandler());
      const { users, siteSettings, useCase } = setup();
      await users.create({ email: "first@example.com", name: "First", passwordHash: "h" });
      await siteSettings.update({ registrationOpen: false });

      await assert.rejects(
        () => useCase.handleCallback("code"),
        (err: unknown) => err instanceof ForbiddenError,
      );
    });

    it("allows the first user to register even when registrationOpen is false", async () => {
      installFetchMock(buildHandler());
      const { users, siteSettings, useCase } = setup();
      await siteSettings.update({ registrationOpen: false });

      await useCase.handleCallback("code");

      assert.equal(users.store.length, 1);
      assert.equal(users.store[0].role, "admin");
    });

    it("throws when token exchange returns a non-2xx status", async () => {
      installFetchMock(
        buildHandler({ tokenStatus: 400, token: "bad request body" }),
      );
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.handleCallback("code"),
        /GitHub token exchange failed: bad request body/,
      );
    });

    it("throws when token exchange returns 200 with an error body", async () => {
      installFetchMock(
        buildHandler({ token: { error: "bad_verification_code" } }),
      );
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.handleCallback("code"),
        /GitHub token exchange failed: bad_verification_code/,
      );
    });

    it("throws when /user returns a non-2xx status", async () => {
      installFetchMock(buildHandler({ userStatus: 401 }));
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.handleCallback("code"),
        /Failed to fetch GitHub user info/,
      );
    });

    it("throws when email is missing and /user/emails has no verified primary", async () => {
      installFetchMock(
        buildHandler({
          user: { ...DEFAULT_GITHUB_USER, email: null },
          emails: [
            { email: "unverified@example.com", primary: true, verified: false },
            { email: "secondary@example.com", primary: false, verified: true },
          ],
        }),
      );
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.handleCallback("code"),
        /GitHub account has no verified email address/,
      );
    });

    it("throws when email is missing and /user/emails returns 404", async () => {
      installFetchMock(
        buildHandler({
          user: { ...DEFAULT_GITHUB_USER, email: null },
          emailsStatus: 404,
          emails: { message: "Not Found" },
        }),
      );
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.handleCallback("code"),
        /GitHub account has no verified email address/,
      );
    });
  });

  describe("handleCallback - registration gating without siteSettings", () => {
    beforeEach(() => {
      setOAuthConfig({
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "https://app.test/cb",
        frontendUrl: "https://app.test",
      });
    });

    it("allows new non-first user when siteSettings dependency is absent", async () => {
      installFetchMock(buildHandler());
      const users = new InMemoryUserRepository();
      const sessions = new InMemorySessionRepository(() => users.store);
      const oauthTokens = new InMemoryOAuthTokenRepository();
      const useCase = new GitHubAuthUseCase(users, sessions, oauthTokens);
      await users.create({ email: "first@example.com", name: "First", passwordHash: "h" });

      await useCase.handleCallback("code");

      assert.equal(users.store.length, 2);
      assert.equal(users.store[1].email, "octo@example.com");
    });
  });

  describe("handleLinkCallback", () => {
    beforeEach(() => {
      setOAuthConfig({
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "https://app.test/cb",
        frontendUrl: "https://app.test",
      });
    });

    it("links the GitHub account to the given user and upserts the oauth token", async () => {
      installFetchMock(buildHandler());
      const { users, oauthTokens, useCase } = setup();
      const user = await users.create({
        email: "user@example.com",
        name: "User",
        passwordHash: "hashed",
      });

      await useCase.handleLinkCallback("code", user.id);

      assert.equal(users.store[0].githubId, "12345");
      assert.equal(users.store[0].githubUsername, "octocat");
      assert.equal(oauthTokens.store.length, 1);
      assert.equal(oauthTokens.store[0].userId, user.id);
      assert.equal(oauthTokens.store[0].provider, "github");
      assert.equal(oauthTokens.store[0].accessToken, "gho_test_token");
    });

    it("throws when the GitHub account is already linked to a different user", async () => {
      installFetchMock(buildHandler());
      const { users, useCase } = setup();
      await users.create({
        email: "owner@example.com",
        name: "Owner",
        passwordHash: null,
        githubId: "12345",
        githubUsername: "octocat",
      });
      const other = await users.create({
        email: "other@example.com",
        name: "Other",
        passwordHash: "hashed",
      });

      await assert.rejects(
        () => useCase.handleLinkCallback("code", other.id),
        /This GitHub account is already linked to another user/,
      );
    });

    it("succeeds when the same user re-links their already-linked GitHub account", async () => {
      installFetchMock(buildHandler());
      const { users, oauthTokens, useCase } = setup();
      const user = await users.create({
        email: "user@example.com",
        name: "User",
        passwordHash: "hashed",
        githubId: "12345",
        githubUsername: "octocat",
      });

      await useCase.handleLinkCallback("code", user.id);

      assert.equal(users.store[0].githubId, "12345");
      assert.equal(oauthTokens.store.length, 1);
      assert.equal(oauthTokens.store[0].userId, user.id);
    });
  });
});
