import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AcceptWorkspaceInviteUseCase } from "../../../application/use-cases/workspaces/accept-workspace-invite";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { InMemoryWorkspaceInvitationRepository } from "../../fakes/in-memory-workspace-invitation-repository";
import { InMemorySiteSettingsRepository } from "../../fakes/in-memory-site-settings-repository";
import { ForbiddenError, NotFoundError } from "../../../domain/errors";
import type { WorkspaceRole } from "../../../domain/entities/workspace";

async function setup() {
  const workspaces = new InMemoryWorkspaceRepository();
  const invitations = new InMemoryWorkspaceInvitationRepository();
  const settings = new InMemorySiteSettingsRepository();
  const ws = await workspaces.create({ name: "Acme", ownerId: "owner-1" });
  const invite = (role: WorkspaceRole, token = `tok-${role}`) =>
    invitations.create({
      workspaceId: ws.id,
      email: "guest@example.com",
      role,
      token,
      invitedBy: "owner-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
  return {
    ws,
    workspaces,
    invitations,
    settings,
    invite,
    useCase: new AcceptWorkspaceInviteUseCase(workspaces, invitations, settings),
  };
}

describe("AcceptWorkspaceInviteUseCase", () => {
  it("adds a new member with the invited role", async () => {
    const { ws, workspaces, invite, useCase } = await setup();
    await invite("editor");

    const result = await useCase.execute("tok-editor", "guest-1");

    assert.equal(result.role, "editor");
    assert.equal(await workspaces.findMemberRole(ws.id, "guest-1"), "editor");
  });

  it("does not lower an existing admin who accepts a lower-role invite", async () => {
    const { ws, workspaces, invite, useCase } = await setup();
    await workspaces.addMember(ws.id, "admin-1", "admin");
    await invite("viewer");

    const result = await useCase.execute("tok-viewer", "admin-1");

    assert.equal(result.role, "admin");
    assert.equal(await workspaces.findMemberRole(ws.id, "admin-1"), "admin");
  });

  it("keeps the owner as admin", async () => {
    const { ws, workspaces, invite, useCase } = await setup();
    await invite("viewer");

    await useCase.execute("tok-viewer", "owner-1");

    assert.equal(await workspaces.findMemberRole(ws.id, "owner-1"), "admin");
  });

  it("still raises a member to a higher invited role", async () => {
    const { ws, workspaces, invite, useCase } = await setup();
    await workspaces.addMember(ws.id, "guest-1", "viewer");
    await invite("editor");

    await useCase.execute("tok-editor", "guest-1");

    assert.equal(await workspaces.findMemberRole(ws.id, "guest-1"), "editor");
  });

  it("lets only one of two concurrent accepts claim the invitation", async () => {
    const { ws, workspaces, invite, useCase } = await setup();
    await invite("editor");

    const results = await Promise.allSettled([
      useCase.execute("tok-editor", "guest-1"),
      useCase.execute("tok-editor", "guest-2"),
    ]);

    assert.deepEqual(
      results.map((r) => r.status).sort((a, b) => a.localeCompare(b)),
      ["fulfilled", "rejected"],
    );
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.ok(rejected.reason instanceof NotFoundError);
    assert.equal(await workspaces.countMembers(ws.id), 2);
  });

  it("refuses a new member when the workspace is full and leaves the invitation usable", async () => {
    const { ws, workspaces, invitations, settings, invite, useCase } = await setup();
    await settings.update({ maxMembersPerWorkspace: 1 });
    await invite("editor");

    await assert.rejects(() => useCase.execute("tok-editor", "guest-1"), ForbiddenError);

    assert.equal(await workspaces.findMemberRole(ws.id, "guest-1"), null);
    assert.equal(invitations.store[0].usedAt, null);
  });

  it("lets an existing member accept when the workspace is full", async () => {
    const { ws, workspaces, settings, invite, useCase } = await setup();
    await settings.update({ maxMembersPerWorkspace: 1 });
    await workspaces.addMember(ws.id, "owner-1", "admin");
    await invite("viewer");

    const result = await useCase.execute("tok-viewer", "owner-1");

    assert.equal(result.role, "admin");
  });
});
