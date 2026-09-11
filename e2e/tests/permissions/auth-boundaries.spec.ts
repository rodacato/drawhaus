import { test, expect } from "../../fixtures/test";

test.describe("Auth Boundaries", () => {
  test("GET /api/diagrams requires auth", async ({ anonApi }) => {
    expect((await anonApi.get("/api/diagrams")).status()).toBe(401);
  });

  test("POST /api/diagrams requires auth", async ({ anonApi }) => {
    const res = await anonApi.post("/api/diagrams", { data: { title: "hack" } });
    expect(res.status()).toBe(401);
  });

  test("GET /api/workspaces requires auth", async ({ anonApi }) => {
    expect((await anonApi.get("/api/workspaces")).status()).toBe(401);
  });

  test("POST /api/workspaces requires auth", async ({ anonApi }) => {
    const res = await anonApi.post("/api/workspaces", { data: { name: "hack" } });
    expect(res.status()).toBe(401);
  });

  test("GET /api/folders requires auth", async ({ anonApi }) => {
    expect((await anonApi.get("/api/folders")).status()).toBe(401);
  });

  test("GET /api/tags requires auth", async ({ anonApi }) => {
    expect((await anonApi.get("/api/tags")).status()).toBe(401);
  });

  test("PATCH /api/auth/me requires auth", async ({ anonApi }) => {
    const res = await anonApi.patch("/api/auth/me", { data: { name: "hack" } });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/auth/account requires auth", async ({ anonApi }) => {
    expect((await anonApi.delete("/api/auth/account")).status()).toBe(401);
  });
});
