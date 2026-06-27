import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ResolveWorkspaceInviteUseCase } from "../../../application/use-cases/workspaces/resolve-workspace-invite";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryWorkspaceInvitationRepository } from "../../fakes/in-memory-workspace-invitation-repository";
import { NotFoundError, ExpiredError } from "../../../domain/errors";

function setup() {
  const workspaces = new InMemoryWorkspaceRepository();
  const invitations = new InMemoryWorkspaceInvitationRepository();
  const useCase = new ResolveWorkspaceInviteUseCase(workspaces, invitations);
  return { workspaces, invitations, useCase };
}

async function seedInvite(
  workspaces: InMemoryWorkspaceRepository,
  invitations: InMemoryWorkspaceInvitationRepository,
  overrides: { token: string; expiresAt: Date },
) {
  const ws = await workspaces.create({ name: "Acme", ownerId: "owner-1" });
  return invitations.create({
    workspaceId: ws.id,
    email: "guest@example.com",
    role: "viewer",
    token: overrides.token,
    invitedBy: "owner-1",
    expiresAt: overrides.expiresAt,
  });
}

describe("ResolveWorkspaceInviteUseCase", () => {
  it("returns workspace name, role and email for a valid token", async () => {
    const { workspaces, invitations, useCase } = setup();
    await seedInvite(workspaces, invitations, { token: "t1", expiresAt: new Date(Date.now() + 1_000_000) });

    const result = await useCase.execute("t1");

    assert.deepEqual(result, { workspaceName: "Acme", role: "viewer", email: "guest@example.com" });
  });

  it("throws NotFoundError when the token does not match", async () => {
    const { useCase } = setup();
    await assert.rejects(() => useCase.execute("missing"), (e: unknown) => e instanceof NotFoundError);
  });

  it("throws NotFoundError when the invitation has been used", async () => {
    const { workspaces, invitations, useCase } = setup();
    const invite = await seedInvite(workspaces, invitations, { token: "t2", expiresAt: new Date(Date.now() + 1_000_000) });
    await invitations.markUsed(invite.id);

    await assert.rejects(() => useCase.execute("t2"), (e: unknown) => e instanceof NotFoundError);
  });

  it("throws ExpiredError when the invitation has expired", async () => {
    const { workspaces, invitations, useCase } = setup();
    await seedInvite(workspaces, invitations, { token: "t3", expiresAt: new Date(Date.now() - 1000) });

    await assert.rejects(() => useCase.execute("t3"), (e: unknown) => e instanceof ExpiredError);
  });
});
