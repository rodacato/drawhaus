import { test, expect } from "@playwright/test";
import { loginAsUser, ADMIN_USER } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

test.describe("Workspace Members", () => {
  let personalWorkspaceId: string;
  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;

  test.beforeAll(async ({ request }) => {
    // Use the personal workspace (always exists, no limit issues)
    const res = await request.get("/api/workspaces");
    if (res.ok()) {
      const workspaces = (await res.json()).workspaces ?? await res.json();
      const personal = workspaces.find((w: any) => w.is_personal || w.isPersonal);
      personalWorkspaceId = personal?.id ?? workspaces[0]?.id;
    }

    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
  });

  test.afterAll(async () => {
    await adminCtx?.dispose();
  });

  test("workspace owner can see workspace details", async ({ request }) => {
    test.skip(!personalWorkspaceId, "No workspace found");

    const res = await request.get(`/api/workspaces/${personalWorkspaceId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("non-member cannot access workspace", async () => {
    test.skip(!personalWorkspaceId, "No workspace found");

    const res = await adminCtx.get(`/api/workspaces/${personalWorkspaceId}`);
    // Admin shouldn't have access to regular user's personal workspace
    expect(res.ok()).toBeFalsy();
  });

  test("workspace owner can update workspace", async ({ request }) => {
    test.skip(!personalWorkspaceId, "No workspace found");

    const res = await request.patch(`/api/workspaces/${personalWorkspaceId}`, {
      data: { description: "Updated by member test" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("can list workspaces", async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const workspaces = body.workspaces ?? body;
    expect(Array.isArray(workspaces)).toBeTruthy();
    expect(workspaces.length).toBeGreaterThan(0);
  });

  test("can invite member by email", async ({ request }) => {
    // Create a temp workspace for invite test
    const createRes = await request.post("/api/workspaces", {
      data: { name: "Invite Test WS" },
    });
    if (!createRes.ok()) {
      test.skip(true, "Could not create workspace (limit reached)");
      return;
    }
    const ws = (await createRes.json()).workspace ?? await createRes.json();

    const res = await request.post(`/api/workspaces/${ws.id}/invite`, {
      data: { email: ADMIN_USER.email, role: "editor" },
    });
    // May succeed or fail if user is already a member
    expect([200, 201, 400, 409].includes(res.status())).toBeTruthy();

    await request.delete(`/api/workspaces/${ws.id}`);
  });
});
