import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RemoveWorkspaceMemberUseCase,
  UpdateWorkspaceMemberRoleUseCase,
} from "../../../application/use-cases/workspaces/manage-members";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { FakeRealtimeNotifier } from "../../fakes/fake-realtime-notifier";
import { ForbiddenError } from "../../../domain/errors";

async function setup() {
  const workspaces = new InMemoryWorkspaceRepository();
  const notifier = new FakeRealtimeNotifier();
  const workspace = await workspaces.create({ name: "Team", ownerId: "admin-1" });
  await workspaces.addMember(workspace.id, "member-1", "editor");
  return { workspaces, notifier, workspace };
}

describe("workspace member access changes", () => {
  it("tells the member's open boards when their role changes", async () => {
    const { workspaces, notifier, workspace } = await setup();

    await new UpdateWorkspaceMemberRoleUseCase(workspaces, notifier).execute(
      workspace.id,
      "admin-1",
      "member-1",
      "viewer",
    );

    assert.deepEqual(notifier.accessesRevoked, [{ kind: "user-access", userId: "member-1" }]);
  });

  it("tells the member's open boards when they are removed", async () => {
    const { workspaces, notifier, workspace } = await setup();

    await new RemoveWorkspaceMemberUseCase(workspaces, notifier).execute(
      workspace.id,
      "admin-1",
      "member-1",
    );

    assert.deepEqual(notifier.accessesRevoked, [{ kind: "user-access", userId: "member-1" }]);
  });

  it("notifies nobody when the change is refused", async () => {
    const { workspaces, notifier, workspace } = await setup();

    await assert.rejects(
      () =>
        new RemoveWorkspaceMemberUseCase(workspaces, notifier).execute(
          workspace.id,
          "member-1",
          "admin-1",
        ),
      ForbiddenError,
    );
    await assert.rejects(
      () =>
        new UpdateWorkspaceMemberRoleUseCase(workspaces, notifier).execute(
          workspace.id,
          "member-1",
          "member-1",
          "admin",
        ),
      ForbiddenError,
    );

    assert.deepEqual(notifier.accessesRevoked, []);
  });
});
