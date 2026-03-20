import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isShareLinkExpired } from "../../../domain/entities/share-link";
import type { ShareLink } from "../../../domain/entities/share-link";

function makeLink(expiresAt: Date | null): ShareLink {
  return {
    token: "test",
    diagramId: "d1",
    createdBy: "u1",
    role: "viewer",
    expiresAt,
    createdAt: new Date(),
  };
}

describe("isShareLinkExpired", () => {
  it("returns false when expiresAt is null", () => {
    assert.equal(isShareLinkExpired(makeLink(null)), false);
  });

  it("returns false when expiresAt is in the future", () => {
    assert.equal(isShareLinkExpired(makeLink(new Date(Date.now() + 60_000))), false);
  });

  it("returns true when expiresAt is in the past", () => {
    assert.equal(isShareLinkExpired(makeLink(new Date(Date.now() - 1000))), true);
  });
});
