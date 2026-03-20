import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CreateDiagramInput,
  ListDiagramsInput,
  GetDiagramInput,
  UpdateDiagramInput,
  DeleteDiagramInput,
} from "../schemas.js";

describe("CreateDiagramInput", () => {
  it("accepts empty object", () => {
    const result = CreateDiagramInput.safeParse({});
    assert.ok(result.success);
  });

  it("accepts title only", () => {
    const result = CreateDiagramInput.safeParse({ title: "My Diagram" });
    assert.ok(result.success);
    assert.equal(result.data.title, "My Diagram");
  });

  it("accepts full input", () => {
    const result = CreateDiagramInput.safeParse({
      title: "Test",
      elements: [{ id: "el-1", type: "rectangle" }],
      appState: { viewBackgroundColor: "#fff" },
      folderId: "550e8400-e29b-41d4-a716-446655440000",
    });
    assert.ok(result.success);
  });

  it("rejects title longer than 200 chars", () => {
    const result = CreateDiagramInput.safeParse({ title: "a".repeat(201) });
    assert.ok(!result.success);
  });

  it("rejects invalid folderId", () => {
    const result = CreateDiagramInput.safeParse({ folderId: "not-a-uuid" });
    assert.ok(!result.success);
  });
});

describe("ListDiagramsInput", () => {
  it("accepts empty object with defaults", () => {
    const result = ListDiagramsInput.safeParse({});
    assert.ok(result.success);
    assert.equal(result.data.limit, 50);
    assert.equal(result.data.offset, 0);
  });

  it("rejects limit > 100", () => {
    const result = ListDiagramsInput.safeParse({ limit: 101 });
    assert.ok(!result.success);
  });

  it("rejects negative offset", () => {
    const result = ListDiagramsInput.safeParse({ offset: -1 });
    assert.ok(!result.success);
  });
});

describe("GetDiagramInput", () => {
  it("accepts valid UUID", () => {
    const result = GetDiagramInput.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    assert.ok(result.success);
  });

  it("rejects non-UUID", () => {
    const result = GetDiagramInput.safeParse({ id: "not-a-uuid" });
    assert.ok(!result.success);
  });

  it("requires id", () => {
    const result = GetDiagramInput.safeParse({});
    assert.ok(!result.success);
  });
});

describe("UpdateDiagramInput", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts id + title", () => {
    const result = UpdateDiagramInput.safeParse({ id: validId, title: "New Title" });
    assert.ok(result.success);
  });

  it("accepts id + elements", () => {
    const result = UpdateDiagramInput.safeParse({ id: validId, elements: [{ id: "el-1" }] });
    assert.ok(result.success);
  });

  it("rejects id only (no update fields)", () => {
    const result = UpdateDiagramInput.safeParse({ id: validId });
    assert.ok(!result.success);
  });

  it("rejects missing id", () => {
    const result = UpdateDiagramInput.safeParse({ title: "Test" });
    assert.ok(!result.success);
  });
});

describe("DeleteDiagramInput", () => {
  it("accepts valid UUID", () => {
    const result = DeleteDiagramInput.safeParse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    assert.ok(result.success);
  });

  it("rejects missing id", () => {
    const result = DeleteDiagramInput.safeParse({});
    assert.ok(!result.success);
  });
});
