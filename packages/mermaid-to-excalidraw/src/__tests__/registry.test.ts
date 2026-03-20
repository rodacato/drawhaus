import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  registerConverter,
  getConverter,
  hasConverter,
  listConverters,
} from "../converter/registry.js";

describe("converter registry", () => {
  it("returns null for unregistered type", () => {
    assert.equal(getConverter("nonexistent"), null);
  });

  it("hasConverter returns false for unregistered type", () => {
    assert.equal(hasConverter("testType"), false);
  });

  it("registers and retrieves a converter", () => {
    const mockConverter = async () => ({
      elements: [],
      diagramType: "testRegistered",
    });

    registerConverter("testRegistered", mockConverter);

    assert.equal(hasConverter("testRegistered"), true);
    assert.equal(getConverter("testRegistered"), mockConverter);
    assert.ok(listConverters().includes("testRegistered"));
  });
});
