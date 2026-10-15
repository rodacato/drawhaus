import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PgWorkspaceInvitationRepository } from "../../infrastructure/persistence/pg-workspace-invitation-repository";
import { createUser, createWorkspace } from "./fixtures";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const invitations = new PgWorkspaceInvitationRepository();

describe("PgWorkspaceInvitationRepository.markUsed", () => {
  it("claims an invitation once and refuses a second claim", async () => {
    const ownerId = await createUser();
    const workspaceId = await createWorkspace(ownerId);
    const invite = await invitations.create({
      workspaceId,
      email: "guest@test.local",
      role: "viewer",
      token: "claim-once-token",
      invitedBy: ownerId,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const claims = await Promise.all([
      invitations.markUsed(invite.id),
      invitations.markUsed(invite.id),
    ]);

    assert.deepEqual(claims.sort(), [false, true]);
    assert.equal(await invitations.markUsed(invite.id), false);
  });
});
