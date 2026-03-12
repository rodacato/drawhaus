import { test, expect } from "@playwright/test";
import { createDiagram } from "../../fixtures/data.fixture";

test.describe("Folders", () => {
  let workspaceId: string;

  test.beforeAll(async ({ request }) => {
    // Get the user's personal workspace
    const res = await request.get("/api/workspaces");
    const workspaces = (await res.json()).workspaces ?? await res.json();
    const personal = workspaces.find((w: any) => w.is_personal || w.isPersonal);
    workspaceId = personal?.id ?? workspaces[0]?.id;
  });

  test("can create folder", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const res = await request.post("/api/folders", {
      data: { name: "Test Folder", workspaceId },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const folder = body.folder ?? body;
    expect(folder.name).toBe("Test Folder");

    // Cleanup
    await request.delete(`/api/folders/${folder.id}`);
  });

  test("can list folders", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const res = await request.get(`/api/folders?workspaceId=${workspaceId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const folders = body.folders ?? body;
    expect(Array.isArray(folders)).toBeTruthy();
  });

  test("can rename folder", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const createRes = await request.post("/api/folders", {
      data: { name: "Rename Me", workspaceId },
    });
    const folder = (await createRes.json()).folder ?? await createRes.json();

    const renameRes = await request.patch(`/api/folders/${folder.id}`, {
      data: { name: "Renamed Folder" },
    });
    expect(renameRes.ok()).toBeTruthy();

    await request.delete(`/api/folders/${folder.id}`);
  });

  test("can delete empty folder", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const createRes = await request.post("/api/folders", {
      data: { name: "Delete Me Folder", workspaceId },
    });
    const folder = (await createRes.json()).folder ?? await createRes.json();

    const deleteRes = await request.delete(`/api/folders/${folder.id}`);
    expect(deleteRes.ok()).toBeTruthy();
  });

  test("can move diagram to folder", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const folderRes = await request.post("/api/folders", {
      data: { name: "Move Target Folder", workspaceId },
    });
    const folder = (await folderRes.json()).folder ?? await folderRes.json();
    const diagram = await createDiagram(request, "Move Me Diagram");

    const moveRes = await request.post(`/api/diagrams/${diagram.id}/move`, {
      data: { folderId: folder.id },
    });
    expect(moveRes.ok()).toBeTruthy();

    // Cleanup
    // Move diagram out first (to uncategorized) then delete folder
    await request.post(`/api/diagrams/${diagram.id}/move`, {
      data: { folderId: null },
    });
    await request.delete(`/api/folders/${folder.id}`);
  });

  test("can filter diagrams by folder", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const folderRes = await request.post("/api/folders", {
      data: { name: "Filter Folder", workspaceId },
    });
    const folder = (await folderRes.json()).folder ?? await folderRes.json();
    const diagram = await createDiagram(request, "Filtered Diagram");

    await request.post(`/api/diagrams/${diagram.id}/move`, {
      data: { folderId: folder.id },
    });

    const listRes = await request.get(`/api/diagrams?folderId=${folder.id}`);
    expect(listRes.ok()).toBeTruthy();

    // Cleanup
    await request.post(`/api/diagrams/${diagram.id}/move`, {
      data: { folderId: null },
    });
    await request.delete(`/api/folders/${folder.id}`);
  });

  test("diagrams filtered by workspace", async ({ request }) => {
    test.skip(!workspaceId, "No workspace found");

    const res = await request.get(`/api/diagrams?workspaceId=${workspaceId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const diagrams = body.diagrams ?? body;
    expect(Array.isArray(diagrams)).toBeTruthy();
  });
});
