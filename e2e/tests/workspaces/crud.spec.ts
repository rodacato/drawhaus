import { test, expect } from "@playwright/test";
import { WS_CRUD_USER } from "../../fixtures/multi-user.fixture";

// Use a dedicated user for workspace CRUD to avoid conflicts with other workspace tests
test.use({ storageState: WS_CRUD_USER.authFile });

test.describe("Workspace CRUD", () => {
  test.describe.configure({ mode: "serial" });

  // Clean up old test workspaces to stay under the limit
  test.beforeAll(async ({ request }) => {
    const res = await request.get("/api/workspaces");
    if (!res.ok()) return;
    const workspaces = (await res.json()).workspaces ?? await res.json();
    for (const ws of workspaces) {
      if (!ws.is_personal && !ws.isPersonal && /CRUD|Verify|Update|Delete Me|List Verify/i.test(ws.name)) {
        await request.delete(`/api/workspaces/${ws.id}`);
      }
    }
  });

  test("personal workspace exists on first load", async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const workspaces = body.workspaces ?? body;
    const personal = workspaces.find((w: any) => w.is_personal || w.isPersonal);
    expect(personal).toBeTruthy();
  });

  test("can create a new workspace", async ({ request }) => {
    const res = await request.post("/api/workspaces", {
      data: { name: "CRUD Test Workspace", description: "Created by E2E test" },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const ws = body.workspace ?? body;
    expect(ws.name).toBe("CRUD Test Workspace");

    // Clean up
    await request.delete(`/api/workspaces/${ws.id}`);
  });

  test("can update workspace name and description", async ({ request }) => {
    const createRes = await request.post("/api/workspaces", {
      data: { name: "Update Test WS" },
    });
    expect(createRes.ok()).toBeTruthy();
    const ws = (await createRes.json()).workspace ?? await createRes.json();

    const updateRes = await request.patch(`/api/workspaces/${ws.id}`, {
      data: { name: "Updated WS Name", description: "Updated description" },
    });
    expect(updateRes.ok()).toBeTruthy();

    // Verify
    const getRes = await request.get(`/api/workspaces/${ws.id}`);
    const updated = (await getRes.json()).workspace ?? await getRes.json();
    expect(updated.name).toBe("Updated WS Name");

    await request.delete(`/api/workspaces/${ws.id}`);
  });

  test("can delete non-personal workspace", async ({ request }) => {
    const createRes = await request.post("/api/workspaces", {
      data: { name: "Delete Me WS" },
    });
    expect(createRes.ok()).toBeTruthy();
    const ws = (await createRes.json()).workspace ?? await createRes.json();

    const deleteRes = await request.delete(`/api/workspaces/${ws.id}`);
    expect(deleteRes.ok()).toBeTruthy();

    // Verify it's gone
    const getRes = await request.get(`/api/workspaces/${ws.id}`);
    expect(getRes.ok()).toBeFalsy();
  });

  test("cannot delete personal workspace", async ({ request }) => {
    const res = await request.get("/api/workspaces");
    const workspaces = (await res.json()).workspaces ?? await res.json();
    const personal = workspaces.find((w: any) => w.is_personal || w.isPersonal);

    if (!personal) {
      test.skip(true, "No personal workspace found");
      return;
    }

    const deleteRes = await request.delete(`/api/workspaces/${personal.id}`);
    expect(deleteRes.ok()).toBeFalsy();
  });

  test("workspace appears in list after creation", async ({ request }) => {
    const createRes = await request.post("/api/workspaces", {
      data: { name: "List Verify WS" },
    });
    expect(createRes.ok()).toBeTruthy();
    const ws = (await createRes.json()).workspace ?? await createRes.json();

    const listRes = await request.get("/api/workspaces");
    const workspaces = (await listRes.json()).workspaces ?? await listRes.json();
    const found = workspaces.find((w: any) => w.id === ws.id);
    expect(found).toBeTruthy();

    await request.delete(`/api/workspaces/${ws.id}`);
  });
});
