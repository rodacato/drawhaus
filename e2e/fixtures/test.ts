import {
  test as base,
  expect,
  request,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

export const BASE_URL = "http://localhost:5173";
export const PRIMARY_AUTH_FILE = "tests/.auth/user.json";

export const ADMIN_USER = {
  name: "Admin User",
  email: "admin@drawhaus.test",
  password: "admin1234",
};

export const PRIMARY_USER = {
  name: "E2E Test User",
  email: "e2e@drawhaus.test",
  password: "Test1234!pass",
};

export type StorageState = Awaited<ReturnType<APIRequestContext["storageState"]>>;

export const SIGNED_OUT: StorageState = { cookies: [], origins: [] };

export type TestUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  api: APIRequestContext;
  storageState: StorageState;
};

export function uniqueEmail(label: string) {
  return `${label}-${randomUUID().slice(0, 8)}@drawhaus.test`;
}

export function newApiContext(storageState: StorageState = SIGNED_OUT) {
  return request.newContext({ baseURL: BASE_URL, storageState });
}

export async function loginApi(email: string, password: string): Promise<APIRequestContext> {
  const api = await newApiContext();
  const res = await api.post("/api/auth/login", { data: { email, password } });
  expect(res.status(), `login as ${email}`).toBe(200);
  return api;
}

type Fixtures = {
  anonApi: APIRequestContext;
  adminApi: APIRequestContext;
  createUser: (label?: string) => Promise<TestUser>;
  openAs: (storageState: StorageState) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  anonApi: async ({}, use) => {
    const api = await newApiContext();
    await use(api);
    await api.dispose();
  },

  // eslint-disable-next-line no-empty-pattern
  adminApi: async ({}, use) => {
    const api = await loginApi(ADMIN_USER.email, ADMIN_USER.password);
    await use(api);
    await api.dispose();
  },

  // eslint-disable-next-line no-empty-pattern
  createUser: async ({}, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (label = "user") => {
      const api = await newApiContext();
      contexts.push(api);
      const email = uniqueEmail(label);
      const user = { name: email.split("@")[0], email, password: "Test1234!pass" };
      const res = await api.post("/api/auth/register", { data: user });
      expect(res.status(), `register ${user.email}: ${await res.text()}`).toBe(201);
      const { user: created } = (await res.json()) as { user: { id: string } };
      return { ...user, id: created.id, api, storageState: await api.storageState() };
    });
    await Promise.all(contexts.map((api) => api.dispose()));
  },

  openAs: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (storageState) => {
      const context = await browser.newContext({ storageState });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});

export { expect };
