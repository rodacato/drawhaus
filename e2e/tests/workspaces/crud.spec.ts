import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { createWorkspace, personalWorkspaceId } from "../../fixtures/api";

async function workspaceIds(api: APIRequestContext) {
  const res = await api.get("/api/workspaces");
  expect(res.ok()).toBeTruthy();
  const { workspaces } = (await res.json()) as { workspaces: { id: string }[] };
  return workspaces.map((w) => w.id);
}

test.describe("Workspace CRUD", () => {
  test("a new user has a personal workspace", async ({ createUser }) => {
    const user = await createUser("ws");

    expect(await workspaceIds(user.api)).toContain(await personalWorkspaceId(user.api));
  });

  test("a created workspace appears in the list", async ({ createUser }) => {
    const user = await createUser("ws");

    const workspace = await createWorkspace(user.api, "CRUD Test Workspace");

    expect(workspace.name).toBe("CRUD Test Workspace");
    expect(await workspaceIds(user.api)).toContain(workspace.id);
  });

  test("updating name and description persists", async ({ createUser }) => {
    const user = await createUser("ws");
    const workspace = await createWorkspace(user.api, "Update Test WS");

    const res = await user.api.patch(`/api/workspaces/${workspace.id}`, {
      data: { name: "Updated WS Name", description: "Updated description" },
    });
    expect(res.ok()).toBeTruthy();

    const { workspace: updated } = await (
      await user.api.get(`/api/workspaces/${workspace.id}`)
    ).json();
    expect(updated.name).toBe("Updated WS Name");
    expect(updated.description).toBe("Updated description");
  });

  test("a deleted workspace is gone", async ({ createUser }) => {
    const user = await createUser("ws");
    const workspace = await createWorkspace(user.api, "Delete Me WS");

    expect((await user.api.delete(`/api/workspaces/${workspace.id}`)).ok()).toBeTruthy();

    expect((await user.api.get(`/api/workspaces/${workspace.id}`)).ok()).toBeFalsy();
    expect(await workspaceIds(user.api)).not.toContain(workspace.id);
  });

  test("the personal workspace cannot be deleted", async ({ createUser }) => {
    const user = await createUser("ws");
    const personalId = await personalWorkspaceId(user.api);

    const res = await user.api.delete(`/api/workspaces/${personalId}`);

    expect(res.ok()).toBeFalsy();
    expect(await workspaceIds(user.api)).toContain(personalId);
  });
});
