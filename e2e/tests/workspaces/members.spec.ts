import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/test";
import { addWorkspaceMember, createWorkspace, personalWorkspaceId } from "../../fixtures/api";

async function memberRole(api: APIRequestContext, workspaceId: string) {
  const res = await api.get(`/api/workspaces/${workspaceId}`);
  return res.ok() ? ((await res.json()) as { role: string }).role : null;
}

test.describe("Workspace Members", () => {
  test("the owner can read and update their workspace", async ({ createUser }) => {
    const owner = await createUser("owner");
    const workspaceId = await personalWorkspaceId(owner.api);

    const res = await owner.api.patch(`/api/workspaces/${workspaceId}`, {
      data: { description: "Updated by member test" },
    });
    expect(res.ok()).toBeTruthy();

    const { workspace } = await (await owner.api.get(`/api/workspaces/${workspaceId}`)).json();
    expect(workspace.description).toBe("Updated by member test");
  });

  test("a non-member cannot access the workspace", async ({ createUser }) => {
    const owner = await createUser("owner");
    const outsider = await createUser("outsider");
    const workspaceId = await personalWorkspaceId(owner.api);

    expect((await outsider.api.get(`/api/workspaces/${workspaceId}`)).ok()).toBeFalsy();
  });

  test("an invited member who accepts gets the invited role", async ({ createUser }) => {
    const owner = await createUser("owner");
    const member = await createUser("member");
    const workspace = await createWorkspace(owner.api, "Invite Test WS");

    await addWorkspaceMember(owner.api, workspace.id, member, "editor");

    expect(await memberRole(member.api, workspace.id)).toBe("editor");
  });

  test("the owner can change a member's role", async ({ createUser }) => {
    const owner = await createUser("owner");
    const member = await createUser("member");
    const workspace = await createWorkspace(owner.api, "Member Mgmt WS");
    await addWorkspaceMember(owner.api, workspace.id, member, "editor");

    const res = await owner.api.patch(`/api/workspaces/${workspace.id}/members/${member.id}`, {
      data: { role: "viewer" },
    });
    expect(res.ok()).toBeTruthy();

    expect(await memberRole(member.api, workspace.id)).toBe("viewer");
  });

  test("a removed member loses access", async ({ createUser }) => {
    const owner = await createUser("owner");
    const member = await createUser("member");
    const workspace = await createWorkspace(owner.api, "Member Mgmt WS");
    await addWorkspaceMember(owner.api, workspace.id, member, "editor");

    const res = await owner.api.delete(`/api/workspaces/${workspace.id}/members/${member.id}`);
    expect(res.ok()).toBeTruthy();

    expect(await memberRole(member.api, workspace.id)).toBeNull();
  });
});
