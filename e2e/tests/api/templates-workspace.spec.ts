import { test, expect } from "@playwright/test";
import { API_TESTS_USER } from "../../fixtures/multi-user.fixture";

test.use({ storageState: API_TESTS_USER.authFile });

test.describe("Templates API — workspace scoping", () => {
  test.describe.configure({ mode: "serial" });

  let personalTemplateId: string;
  let workspaceTemplateId: string;
  let workspaceId: string;

  test("setup: get or create a workspace", async ({ request }) => {
    const res = await request.get("/api/workspaces");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const workspaces = body.workspaces ?? body;
    // Use the first non-personal workspace, or personal if none
    const ws = workspaces.find((w: any) => !w.isPersonal) ?? workspaces[0];
    expect(ws).toBeTruthy();
    workspaceId = ws.id;
  });

  test("create a personal template (no workspaceId)", async ({ request }) => {
    const res = await request.post("/api/templates", {
      data: {
        title: "Personal Only Template",
        category: "general",
        elements: [{ type: "rectangle", id: "p1", x: 0, y: 0, width: 50, height: 50 }],
        appState: {},
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    personalTemplateId = (body.template ?? body).id;
  });

  test("create a workspace template (with workspaceId)", async ({ request }) => {
    test.skip(!workspaceId, "No workspace available");

    const res = await request.post("/api/templates", {
      data: {
        title: "Workspace Shared Template",
        category: "architecture",
        workspaceId,
        elements: [{ type: "rectangle", id: "w1", x: 0, y: 0, width: 50, height: 50 }],
        appState: {},
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    workspaceTemplateId = (body.template ?? body).id;
    expect((body.template ?? body).workspaceId).toBe(workspaceId);
  });

  test("GET /api/templates returns both personal and workspace templates", async ({ request }) => {
    test.skip(!personalTemplateId || !workspaceTemplateId, "Templates not created");

    const res = await request.get("/api/templates");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const templates = body.templates ?? body;

    const personal = templates.find((t: any) => t.id === personalTemplateId);
    const workspace = templates.find((t: any) => t.id === workspaceTemplateId);

    expect(personal).toBeTruthy();
    expect(workspace).toBeTruthy();
  });

  test("GET /api/templates?workspaceId= includes workspace templates without duplication", async ({ request }) => {
    test.skip(!workspaceId || !workspaceTemplateId, "No workspace template");

    const res = await request.get(`/api/templates?workspaceId=${workspaceId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const templates = body.templates ?? body;

    // Workspace template should appear exactly once (no duplicates from dedup logic)
    const wsTemplates = templates.filter((t: any) => t.id === workspaceTemplateId);
    expect(wsTemplates).toHaveLength(1);
  });

  test("cleanup: delete test templates", async ({ request }) => {
    if (personalTemplateId) {
      await request.delete(`/api/templates/${personalTemplateId}`);
    }
    if (workspaceTemplateId) {
      await request.delete(`/api/templates/${workspaceTemplateId}`);
    }
  });
});
