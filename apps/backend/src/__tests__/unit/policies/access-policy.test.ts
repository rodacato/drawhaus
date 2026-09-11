import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canUseWorkspace, folderFitsTarget } from "../../../domain/policies/access-policy";
import type { Folder } from "../../../domain/entities/folder";

function folder(overrides: Partial<Folder>): Folder {
  return {
    id: "folder-1",
    ownerId: "owner",
    workspaceId: null,
    name: "Folder",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("access policy — workspace", () => {
  it("allows personal content without any membership", () => {
    assert.equal(canUseWorkspace(null, null), true);
  });

  it("allows every member role", () => {
    for (const role of ["admin", "editor", "viewer"] as const) {
      assert.equal(canUseWorkspace("ws-1", role), true);
    }
  });

  it("denies a workspace the user is not a member of", () => {
    assert.equal(canUseWorkspace("ws-1", null), false);
  });
});

describe("access policy — folder placement", () => {
  it("accepts a folder of the target workspace, whoever created it", () => {
    const target = { userId: "u1", workspaceId: "ws-1" };
    assert.equal(folderFitsTarget(folder({ workspaceId: "ws-1", ownerId: "u2" }), target), true);
  });

  it("rejects a folder of another workspace", () => {
    const target = { userId: "u1", workspaceId: "ws-1" };
    assert.equal(folderFitsTarget(folder({ workspaceId: "ws-2", ownerId: "u1" }), target), false);
  });

  it("rejects a personal folder when the target is a workspace", () => {
    const target = { userId: "u1", workspaceId: "ws-1" };
    assert.equal(folderFitsTarget(folder({ workspaceId: null, ownerId: "u1" }), target), false);
  });

  it("accepts the user's own folder for personal content", () => {
    const target = { userId: "u1", workspaceId: null };
    assert.equal(folderFitsTarget(folder({ ownerId: "u1" }), target), true);
  });

  it("rejects someone else's folder for personal content", () => {
    const target = { userId: "u1", workspaceId: null };
    assert.equal(folderFitsTarget(folder({ ownerId: "u2" }), target), false);
  });
});
