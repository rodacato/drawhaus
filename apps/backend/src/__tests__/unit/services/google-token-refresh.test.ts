import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { GoogleTokenRefresher } from "../../../infrastructure/services/google-token-refresh";
import { InMemoryOAuthTokenRepository } from "../../fakes/in-memory-oauth-token-repository";
import { DriveTokenError } from "../../../domain/errors";
import { config } from "../../../infrastructure/config";

type ConfigMut = { googleClientId: string; googleClientSecret: string };
const mutableConfig = config as unknown as ConfigMut;
const ORIGINAL_CONFIG = {
  googleClientId: mutableConfig.googleClientId,
  googleClientSecret: mutableConfig.googleClientSecret,
};

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
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

function textResponse(text: string, ok = false, status = 400): FetchResponse {
  return { ok, status, json: async () => ({}), text: async () => text };
}

const USER_ID = "user-1";

beforeEach(() => {
  Object.assign(mutableConfig, {
    googleClientId: "test-client-id",
    googleClientSecret: "test-client-secret",
  });
});

afterEach(() => {
  mock.restoreAll();
  Object.assign(mutableConfig, ORIGINAL_CONFIG);
});

describe("GoogleTokenRefresher.getValidAccessToken — sad paths before fetch", () => {
  it("throws default DriveTokenError when no token is stored for the user", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    const refresher = new GoogleTokenRefresher(tokens);

    await assert.rejects(
      () => refresher.getValidAccessToken(USER_ID),
      (err: unknown) =>
        err instanceof DriveTokenError && err.message === "Google Drive authorization required",
    );
  });

  it("throws DriveTokenError('No refresh token available') when refreshToken is null", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "access",
      scopes: "drive.file",
    });
    const refresher = new GoogleTokenRefresher(tokens);

    await assert.rejects(
      () => refresher.getValidAccessToken(USER_ID),
      (err: unknown) =>
        err instanceof DriveTokenError && err.message === "No refresh token available",
    );
  });

  it("throws DriveTokenError when scopes does not include 'drive.file'", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "access",
      refreshToken: "refresh",
      scopes: "openid email profile",
    });
    const refresher = new GoogleTokenRefresher(tokens);

    await assert.rejects(
      () => refresher.getValidAccessToken(USER_ID),
      (err: unknown) =>
        err instanceof DriveTokenError &&
        err.message === "Google Drive scope not granted. Please reconnect Google Drive.",
    );
  });
});

describe("GoogleTokenRefresher.getValidAccessToken — token validity buffer", () => {
  it("returns the current accessToken without calling fetch when token is well within the 5-minute buffer", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "still-valid-access",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      scopes: "drive.file",
    });
    const fetchMock = installFetchMock(() => {
      throw new Error("fetch should not be called");
    });
    const refresher = new GoogleTokenRefresher(tokens);

    const result = await refresher.getValidAccessToken(USER_ID);

    assert.equal(result, "still-valid-access");
    assert.equal(fetchMock.mock.calls.length, 0);
  });

  it("refreshes when tokenExpiresAt is null (no expiry recorded)", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "old-access",
      refreshToken: "refresh",
      scopes: "drive.file",
    });
    const fetchMock = installFetchMock((url) => {
      assert.equal(url, "https://oauth2.googleapis.com/token");
      return jsonResponse({ access_token: "new-access", expires_in: 3600 });
    });
    const refresher = new GoogleTokenRefresher(tokens);

    const result = await refresher.getValidAccessToken(USER_ID);

    assert.equal(result, "new-access");
    assert.equal(fetchMock.mock.calls.length, 1);
  });

  it("refreshes when tokenExpiresAt is in the past", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "expired-access",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: "drive.file",
    });
    installFetchMock(() => jsonResponse({ access_token: "fresh-access", expires_in: 3600 }));
    const refresher = new GoogleTokenRefresher(tokens);

    const result = await refresher.getValidAccessToken(USER_ID);

    assert.equal(result, "fresh-access");
  });
});

describe("GoogleTokenRefresher.getValidAccessToken — successful refresh", () => {
  it("upserts the new access token with computed expiresAt and preserves refresh token + scopes", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "old-access",
      refreshToken: "the-refresh-token",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: "drive.file openid",
    });
    installFetchMock(() => jsonResponse({ access_token: "fresh-access", expires_in: 1800 }));
    const refresher = new GoogleTokenRefresher(tokens);

    const before = Date.now();
    const result = await refresher.getValidAccessToken(USER_ID);
    const after = Date.now();

    assert.equal(result, "fresh-access");
    const stored = tokens.store.find((t) => t.userId === USER_ID && t.provider === "google");
    assert.ok(stored);
    assert.equal(stored.accessToken, "fresh-access");
    assert.equal(stored.refreshToken, "the-refresh-token");
    assert.equal(stored.scopes, "drive.file openid");
    assert.ok(stored.tokenExpiresAt);
    const expMs = stored.tokenExpiresAt.getTime();
    assert.ok(expMs >= before + 1800 * 1000);
    assert.ok(expMs <= after + 1800 * 1000);
  });

  it("sends the refresh request with the configured client credentials and grant_type=refresh_token", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "old",
      refreshToken: "my-refresh",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: "drive.file",
    });
    const fetchMock = installFetchMock(() => jsonResponse({ access_token: "new", expires_in: 3600 }));
    const refresher = new GoogleTokenRefresher(tokens);

    await refresher.getValidAccessToken(USER_ID);

    const call = fetchMock.mock.calls[0];
    assert.equal(call.arguments[0], "https://oauth2.googleapis.com/token");
    const init = call.arguments[1] as FetchInit;
    assert.equal(init.method, "POST");
    assert.equal(init.headers?.["Content-Type"], "application/x-www-form-urlencoded");
    const body = new URLSearchParams(init.body as string);
    assert.equal(body.get("client_id"), "test-client-id");
    assert.equal(body.get("client_secret"), "test-client-secret");
    assert.equal(body.get("refresh_token"), "my-refresh");
    assert.equal(body.get("grant_type"), "refresh_token");
  });
});

describe("GoogleTokenRefresher.getValidAccessToken — refresh failures", () => {
  it("on 400 + invalid_grant: deletes the stored token and throws DriveTokenError", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "old",
      refreshToken: "revoked",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: "drive.file",
    });
    installFetchMock(() => textResponse('{"error":"invalid_grant"}', false, 400));
    const refresher = new GoogleTokenRefresher(tokens);

    await assert.rejects(
      () => refresher.getValidAccessToken(USER_ID),
      (err: unknown) =>
        err instanceof DriveTokenError &&
        err.message === "Google access revoked. Please reconnect.",
    );
    assert.equal(tokens.store.length, 0, "token must be removed when access is revoked");
  });

  it("on non-invalid_grant failure (e.g. 500): throws a generic Error and keeps the stored token", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "old",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: "drive.file",
    });
    installFetchMock(() => textResponse("internal server error", false, 500));
    const refresher = new GoogleTokenRefresher(tokens);

    await assert.rejects(
      () => refresher.getValidAccessToken(USER_ID),
      (err: unknown) =>
        err instanceof Error &&
        !(err instanceof DriveTokenError) &&
        /Token refresh failed: internal server error/.test(err.message),
    );
    assert.equal(tokens.store.length, 1, "token must be preserved on transient failures");
  });

  it("on 400 without 'invalid_grant' in body: throws generic Error (no deletion)", async () => {
    const tokens = new InMemoryOAuthTokenRepository();
    await tokens.upsert({
      userId: USER_ID,
      provider: "google",
      accessToken: "old",
      refreshToken: "refresh",
      tokenExpiresAt: new Date(Date.now() - 60_000),
      scopes: "drive.file",
    });
    installFetchMock(() => textResponse("bad request: missing field", false, 400));
    const refresher = new GoogleTokenRefresher(tokens);

    await assert.rejects(
      () => refresher.getValidAccessToken(USER_ID),
      (err: unknown) =>
        err instanceof Error &&
        !(err instanceof DriveTokenError) &&
        /Token refresh failed/.test(err.message),
    );
    assert.equal(tokens.store.length, 1);
  });
});
