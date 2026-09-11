import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createDiagram, createFolder, personalWorkspaceId } from "../../fixtures/api";

async function folderNames(api: APIRequestContext, workspaceId: string) {
  const res = await api.get(`/api/folders?workspaceId=${workspaceId}`);
  expect(res.ok()).toBeTruthy();
  const { folders } = (await res.json()) as { folders: { name: string }[] };
  return folders.map((f) => f.name);
}

async function diagramIds(api: APIRequestContext, query: string) {
  const res = await api.get(`/api/diagrams?${query}`);
  expect(res.ok()).toBeTruthy();
  const { diagrams } = (await res.json()) as { diagrams: { id: string }[] };
  return diagrams.map((d) => d.id);
}

async function moveToFolder(api: APIRequestContext, diagramId: string, folderId: string | null) {
  const res = await api.post(`/api/diagrams/${diagramId}/move`, { data: { folderId } });
  expect(res.ok()).toBeTruthy();
}

test.describe("Folders", () => {
  test("a created folder is listed in its workspace", async ({ createUser }) => {
    const user = await createUser("folders");
    const workspaceId = await personalWorkspaceId(user.api);

    await createFolder(user.api, workspaceId, "Test Folder");

    expect(await folderNames(user.api, workspaceId)).toContain("Test Folder");
  });

  test("renaming a folder persists", async ({ createUser }) => {
    const user = await createUser("folders");
    const workspaceId = await personalWorkspaceId(user.api);
    const folder = await createFolder(user.api, workspaceId, "Rename Me");

    const res = await user.api.patch(`/api/folders/${folder.id}`, {
      data: { name: "Renamed Folder" },
    });
    expect(res.ok()).toBeTruthy();

    const names = await folderNames(user.api, workspaceId);
    expect(names).toContain("Renamed Folder");
    expect(names).not.toContain("Rename Me");
  });

  test("deleting an empty folder removes it", async ({ createUser }) => {
    const user = await createUser("folders");
    const workspaceId = await personalWorkspaceId(user.api);
    const folder = await createFolder(user.api, workspaceId, "Delete Me Folder");

    expect((await user.api.delete(`/api/folders/${folder.id}`)).ok()).toBeTruthy();

    expect(await folderNames(user.api, workspaceId)).not.toContain("Delete Me Folder");
  });

  test("a diagram is listed under the folder it was moved into", async ({ createUser }) => {
    const user = await createUser("folders");
    const workspaceId = await personalWorkspaceId(user.api);
    const folder = await createFolder(user.api, workspaceId, "Move Target Folder");
    const diagram = await createDiagram(user.api, { title: "Move Me Diagram", workspaceId });

    await moveToFolder(user.api, diagram.id, folder.id);
    expect(await diagramIds(user.api, `folderId=${folder.id}`)).toContain(diagram.id);

    await moveToFolder(user.api, diagram.id, null);
    expect(await diagramIds(user.api, `folderId=${folder.id}`)).not.toContain(diagram.id);
  });

  test("diagrams are listed under their workspace", async ({ createUser }) => {
    const user = await createUser("folders");
    const workspaceId = await personalWorkspaceId(user.api);
    const diagram = await createDiagram(user.api, { title: "Workspace Diagram", workspaceId });

    expect(await diagramIds(user.api, `workspaceId=${workspaceId}`)).toContain(diagram.id);
  });
});
