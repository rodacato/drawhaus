import { test, expect, type TestUser, SIGNED_OUT } from "../../fixtures/test";
import { createWorkspace, inviteToWorkspace } from "../../fixtures/api";

async function pendingInvite(createUser: (label?: string) => Promise<TestUser>) {
  const owner = await createUser("owner");
  const invitee = await createUser("invitee");
  const workspace = await createWorkspace(owner.api, "Invite Flow WS");
  const token = await inviteToWorkspace(owner.api, workspace.id, invitee.email, "editor");
  return { invitee, workspaceId: workspace.id, token };
}

test.describe("Workspace Invitations", () => {
  test("an invitation token describes the workspace and role", async ({ createUser, anonApi }) => {
    const { token } = await pendingInvite(createUser);

    const res = await anonApi.get(`/api/workspaces/invite/${token}`);

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.workspaceName).toBe("Invite Flow WS");
    expect(body.role).toBe("editor");
  });

  test("an unknown invitation token is rejected", async ({ anonApi }) => {
    expect((await anonApi.get("/api/workspaces/invite/invalid-token-xyz")).ok()).toBeFalsy();
  });

  test("accepting an invitation grants access to the workspace", async ({ createUser }) => {
    const { invitee, workspaceId, token } = await pendingInvite(createUser);
    expect((await invitee.api.get(`/api/workspaces/${workspaceId}`)).ok()).toBeFalsy();

    const res = await invitee.api.post("/api/workspaces/accept-invite", { data: { token } });
    expect(res.ok()).toBeTruthy();

    expect((await invitee.api.get(`/api/workspaces/${workspaceId}`)).ok()).toBeTruthy();
  });

  test("UI: the invitee accepts from the invitation page", async ({ createUser, openAs }) => {
    const { invitee, workspaceId, token } = await pendingInvite(createUser);
    const page = await openAs(invitee.storageState);

    await page.goto(`/workspace-invite/${token}`);
    await page.getByRole("button", { name: "Accept Invitation" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    const { role } = await (await invitee.api.get(`/api/workspaces/${workspaceId}`)).json();
    expect(role).toBe("editor");
  });

  test("UI: a signed-out visitor is sent to log in first", async ({ createUser, openAs }) => {
    const { token } = await pendingInvite(createUser);
    const page = await openAs(SIGNED_OUT);

    await page.goto(`/workspace-invite/${token}`);
    await expect(page.getByRole("heading", { name: "Workspace Invitation" })).toBeVisible();
    await expect(page.getByText("Invite Flow WS")).toBeVisible();
    await page.getByRole("button", { name: "Log in to Accept" }).click();

    await expect(page).toHaveURL(`/login?redirect=/workspace-invite/${token}`);
  });

  test("UI: an unknown invitation shows an error", async ({ openAs }) => {
    const page = await openAs(SIGNED_OUT);

    await page.goto("/workspace-invite/bad-token-xyz");

    await expect(page.getByText("Invitation not found.")).toBeVisible();
  });
});
