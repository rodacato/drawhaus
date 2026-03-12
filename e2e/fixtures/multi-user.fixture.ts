import { test as base, request as playwrightRequest, APIRequestContext } from "@playwright/test";

export const ADMIN_USER = {
  email: "admin@drawhaus.test",
  password: "admin1234",
};

export const REGULAR_USER = {
  email: "e2e@drawhaus.test",
  password: "Test1234!pass",
};

/** Domain-specific users — each test domain gets its own user to avoid resource conflicts */
export const WS_CRUD_USER = {
  email: "e2e-ws-crud@drawhaus.test",
  password: "Test1234!pass",
  authFile: "tests/.auth/ws-crud.json",
};

export const WS_MEMBER_USER = {
  email: "e2e-ws-member@drawhaus.test",
  password: "Test1234!pass",
  authFile: "tests/.auth/ws-member.json",
};

export const API_TESTS_USER = {
  email: "e2e-api@drawhaus.test",
  password: "Test1234!pass",
  authFile: "tests/.auth/api-tests.json",
};

/**
 * Login via API and return an authenticated APIRequestContext.
 */
export async function loginAsUser(baseURL: string, email: string, password: string): Promise<APIRequestContext> {
  const ctx = await playwrightRequest.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const res = await ctx.post("/api/auth/login", {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${res.status()}`);
  }
  return ctx;
}

/**
 * Create an unauthenticated request context (no cookies).
 */
export async function unauthenticatedContext(baseURL: string): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
}

export { base as test };
export { expect } from "@playwright/test";
