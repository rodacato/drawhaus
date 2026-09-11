import { test, expect, type TestUser } from "../../fixtures/test";
import { addWorkspaceMember, createDiagram, createWorkspace, getDiagram } from "../../fixtures/api";

async function workspaceWithAdmin(createUser: (label?: string) => Promise<TestUser>) {
  const owner = await createUser("owner");
  const admin = await createUser("ws-admin");
  const workspace = await createWorkspace(owner.api, "Transfer Test WS");
  await addWorkspaceMember(owner.api, workspace.id, admin, "admin");
  const diagram = await createDiagram(owner.api, {
    title: "Transfer Test Diagram",
    workspaceId: workspace.id,
  });
  return { owner, admin, workspaceId: workspace.id, diagramId: diagram.id };
}

async function workspaceOwnerId(user: TestUser, workspaceId: string) {
  const res = await user.api.get(`/api/workspaces/${workspaceId}`);
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { workspace: { ownerId: string } }).workspace.ownerId;
}

test.describe("Workspace Ownership Transfer", () => {
  test("a non-owner cannot transfer ownership", async ({ createUser }) => {
    const { owner, admin, workspaceId } = await workspaceWithAdmin(createUser);

    const res = await admin.api.post(`/api/workspaces/${workspaceId}/transfer-ownership`, {
      data: { newOwnerId: admin.id },
    });

    expect(res.status()).toBe(403);
    expect(await workspaceOwnerId(owner, workspaceId)).toBe(owner.id);
  });

  test("transferring moves the workspace and its diagrams to the new owner", async ({
    createUser,
  }) => {
    const { owner, admin, workspaceId, diagramId } = await workspaceWithAdmin(createUser);

    const res = await owner.api.post(`/api/workspaces/${workspaceId}/transfer-ownership`, {
      data: { newOwnerId: admin.id, transferResources: true },
    });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).success).toBe(true);

    expect(await workspaceOwnerId(admin, workspaceId)).toBe(admin.id);
    expect((await getDiagram(admin.api, diagramId)).ownerId).toBe(admin.id);
    expect((await owner.api.get(`/api/workspaces/${workspaceId}`)).ok()).toBeTruthy();

    const shared = await owner.api.get("/api/workspaces/owned-shared");
    const { workspaces } = (await shared.json()) as { workspaces: { id: string }[] };
    expect(workspaces.map((w) => w.id)).not.toContain(workspaceId);
  });
});
