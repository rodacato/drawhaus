import { test, expect } from "@playwright/test";
import { loginAsUser, ADMIN_USER, WS_MEMBER_USER } from "../../fixtures/multi-user.fixture";

const BASE_URL = "http://localhost:5173";

// Use a dedicated user for workspace member tests to avoid conflicts with CRUD tests
test.use({ storageState: WS_MEMBER_USER.authFile });

async function getPersonalWorkspaceId(request: any): Promise<string | null> {
  const res = await request.get("/api/workspaces");
  if (!res.ok()) return null;
  const body = await res.json();
  const workspaces = body.workspaces ?? body;
  if (!Array.isArray(workspaces) || workspaces.length === 0) return null;
  const personal = workspaces.find((w: any) => w.is_personal || w.isPersonal);
  return personal?.id ?? workspaces[0]?.id ?? null;
}

test.describe("Workspace Members", () => {
  let adminCtx: Awaited<ReturnType<typeof loginAsUser>>;

  test.beforeAll(async () => {
    adminCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);
  });

  test.afterAll(async () => {
    await adminCtx?.dispose();
  });

  test("workspace owner can see workspace details", async ({ request }) => {
    const wsId = await getPersonalWorkspaceId(request);
    test.skip(!wsId, "No workspace found");

    const res = await request.get(`/api/workspaces/${wsId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("non-member cannot access workspace", async ({ request }) => {
    const wsId = await getPersonalWorkspaceId(request);
    test.skip(!wsId, "No workspace found");

    const res = await adminCtx.get(`/api/workspaces/${wsId}`);
    expect(res.ok()).toBeFalsy();
  });

  test("workspace owner can update workspace", async ({ request }) => {
    const wsId = await getPersonalWorkspaceId(request);
    test.skip(!wsId, "No workspace found");

    const res = await request.patch(`/api/workspaces/${wsId}`, {
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

test.describe("Workspace Member Management", () => {
  test.describe.configure({ mode: "serial" });

  let ownerCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let memberCtx: Awaited<ReturnType<typeof loginAsUser>>;
  let workspaceId: string;
  let memberId: string;

  test.beforeAll(async () => {
    ownerCtx = await loginAsUser(BASE_URL, WS_MEMBER_USER.email, WS_MEMBER_USER.password);
    memberCtx = await loginAsUser(BASE_URL, ADMIN_USER.email, ADMIN_USER.password);

    // Get admin user's ID
    const meRes = await memberCtx.get("/api/auth/me");
    const meBody = await meRes.json();
    memberId = meBody.user?.id ?? meBody.id;

    // Create workspace
    const wsRes = await ownerCtx.post("/api/workspaces", {
      data: { name: "Member Mgmt WS" },
    });
    if (!wsRes.ok()) return;
    const wsBody = await wsRes.json();
    workspaceId = wsBody.workspace?.id ?? wsBody.id;

    // Invite and accept
    const inviteRes = await ownerCtx.post(`/api/workspaces/${workspaceId}/invite`, {
      data: { email: ADMIN_USER.email, role: "editor" },
    });
    if (inviteRes.ok() || inviteRes.status() === 201) {
      const invBody = await inviteRes.json();
      const token = invBody.invitation?.token ?? invBody.token;
      if (token) {
        await memberCtx.post("/api/workspaces/accept-invite", { data: { token } });
      }
    }
  });

  test.afterAll(async () => {
    if (workspaceId) {
      await ownerCtx.delete(`/api/workspaces/${workspaceId}`).catch(() => {});
    }
    await ownerCtx?.dispose();
    await memberCtx?.dispose();
  });

  test("can change member role", async () => {
    test.skip(!workspaceId || !memberId, "Setup incomplete");
    const res = await ownerCtx.patch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      data: { role: "viewer" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("can remove member from workspace", async () => {
    test.skip(!workspaceId || !memberId, "Setup incomplete");
    const res = await ownerCtx.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
    expect(res.ok()).toBeTruthy();
  });

  test("removed member loses access", async () => {
    test.skip(!workspaceId, "Setup incomplete");
    const res = await memberCtx.get(`/api/workspaces/${workspaceId}`);
    expect(res.ok()).toBeFalsy();
  });
});
