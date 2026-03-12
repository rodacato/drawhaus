import { test, expect } from "@playwright/test";
import { loginAsUser, REGULAR_USER, ADMIN_USER } from "../../fixtures/multi-user.fixture";
import { createDiagram, createShareLink } from "../../fixtures/data.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Resource Access", () => {
  let userCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;

  test.beforeAll(async () => {
    userCtx = await loginAsUser(BASE_URL, REGULAR_USER.email, REGULAR_USER.password);
    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
  });

  test.afterAll(async () => {
    await userCtx.dispose();
    await adminCtx.dispose();
  });

  test("user cannot access another user's diagram", async () => {
    // Admin creates a diagram
    const diagram = await createDiagram(adminCtx, "Admin Private Diagram");
    // Regular user tries to access it
    const res = await userCtx.get(`/api/diagrams/${diagram.id}`);
    expect(res.ok()).toBeFalsy();
  });

  test("user cannot update another user's diagram", async () => {
    const diagram = await createDiagram(adminCtx, "Admin Edit Test");
    const res = await userCtx.patch(`/api/diagrams/${diagram.id}`, {
      data: { title: "Hacked" },
    });
    expect(res.ok()).toBeFalsy();
  });

  test("user cannot delete another user's diagram", async () => {
    const diagram = await createDiagram(adminCtx, "Admin Delete Test");
    const res = await userCtx.delete(`/api/diagrams/${diagram.id}`);
    expect(res.ok()).toBeFalsy();
  });

  test("share link resolves for unauthenticated users", async () => {
    const diagram = await createDiagram(userCtx, "Shared Diagram");
    const share = await createShareLink(userCtx, diagram.id, "viewer");

    // Access without auth via the public resolve endpoint
    const { unauthenticatedContext } = await import("../../fixtures/multi-user.fixture");
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/share/link/${share.token}`);
    expect(res.ok()).toBeTruthy();
    await noAuth.dispose();
  });

  test("deleted share link no longer resolves", async () => {
    const diagram = await createDiagram(userCtx, "Revoke Share Test");
    const share = await createShareLink(userCtx, diagram.id, "viewer");

    // Delete the share link
    await userCtx.delete(`/api/share/link/${share.token}`);

    // Try to resolve it
    const { unauthenticatedContext } = await import("../../fixtures/multi-user.fixture");
    const noAuth = await unauthenticatedContext(BASE_URL);
    const res = await noAuth.get(`/api/share/link/${share.token}`);
    expect(res.ok()).toBeFalsy();
    await noAuth.dispose();
  });

  test("user can access own diagram", async () => {
    const diagram = await createDiagram(userCtx, "My Own Diagram");
    const res = await userCtx.get(`/api/diagrams/${diagram.id}`);
    expect(res.ok()).toBeTruthy();
  });
});
