import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canReadTemplate } from "../../../domain/policies/template-policy";

describe("template policy — read", () => {
  it("lets the creator read a personal template", () => {
    assert.equal(canReadTemplate({ creatorId: "u1", workspaceId: null }, "u1", null), true);
  });

  it("lets the creator read a workspace template they are no longer a member of", () => {
    assert.equal(canReadTemplate({ creatorId: "u1", workspaceId: "ws-1" }, "u1", null), true);
  });

  it("lets every member role of the template's workspace read it", () => {
    for (const role of ["admin", "editor", "viewer"] as const) {
      assert.equal(canReadTemplate({ creatorId: "u2", workspaceId: "ws-1" }, "u1", role), true);
    }
  });

  it("hides a personal template from everyone but its creator", () => {
    assert.equal(canReadTemplate({ creatorId: "u2", workspaceId: null }, "u1", null), false);
  });

  it("hides a workspace template from a non-member", () => {
    assert.equal(canReadTemplate({ creatorId: "u2", workspaceId: "ws-1" }, "u1", null), false);
  });

  it("grants nothing on a personal template for a role held elsewhere", () => {
    assert.equal(canReadTemplate({ creatorId: "u2", workspaceId: null }, "u1", "admin"), false);
  });
});
