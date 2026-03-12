import { test, expect } from "@playwright/test";
import { unauthenticatedContext } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Auth Boundaries", () => {
  let noAuth: Awaited<ReturnType<typeof unauthenticatedContext>>;

  test.beforeAll(async () => {
    noAuth = await unauthenticatedContext(BASE_URL);
  });

  test.afterAll(async () => {
    await noAuth.dispose();
  });

  test("GET /api/diagrams requires auth", async () => {
    const res = await noAuth.get("/api/diagrams");
    expect(res.status()).toBe(401);
  });

  test("POST /api/diagrams requires auth", async () => {
    const res = await noAuth.post("/api/diagrams", { data: { title: "hack" } });
    expect(res.status()).toBe(401);
  });

  test("GET /api/workspaces requires auth", async () => {
    const res = await noAuth.get("/api/workspaces");
    expect(res.status()).toBe(401);
  });

  test("POST /api/workspaces requires auth", async () => {
    const res = await noAuth.post("/api/workspaces", { data: { name: "hack" } });
    expect(res.status()).toBe(401);
  });

  test("GET /api/folders requires auth", async () => {
    const res = await noAuth.get("/api/folders");
    expect(res.status()).toBe(401);
  });

  test("GET /api/tags requires auth", async () => {
    const res = await noAuth.get("/api/tags");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/auth/me requires auth", async () => {
    const res = await noAuth.patch("/api/auth/me", { data: { name: "hack" } });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/auth/account requires auth", async () => {
    const res = await noAuth.delete("/api/auth/account");
    expect(res.status()).toBe(401);
  });
});
