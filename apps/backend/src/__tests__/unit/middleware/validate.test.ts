import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validate, validateQuery, validateParams } from "../../../infrastructure/http/middleware/validate";

type CapturedResponse = {
  statusCode: number;
  body: unknown;
};

function makeRes(): { res: CapturedResponse & { status: (n: number) => unknown; json: (b: unknown) => unknown } } {
  const captured: CapturedResponse = { statusCode: 0, body: undefined };
  const res = {
    statusCode: captured.statusCode,
    body: captured.body,
    status(code: number) {
      captured.statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      captured.body = body;
      this.body = body;
      return this;
    },
  };
  return { res };
}

describe("validate middleware", () => {
  it("calls next() and replaces req.body with parsed data on success", () => {
    const schema = z.object({ name: z.string(), age: z.coerce.number() });
    const req = { body: { name: "ada", age: "37" } } as { body: unknown };
    const { res } = makeRes();
    let nextCalled = false;

    validate(schema)(req as never, res as never, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.body, { name: "ada", age: 37 });
  });

  it("returns 400 with error AND Zod details on failure", () => {
    const schema = z.object({ name: z.string().min(2), age: z.number() });
    const req = { body: { name: "x", age: "not-a-number" } };
    const { res } = makeRes();

    validate(schema)(req as never, res as never, () => { throw new Error("next should NOT be called"); });

    assert.equal(res.statusCode, 400);
    const body = res.body as { error: string; details: Array<{ path: string; code: string; message: string }> };
    assert.equal(body.error, "Invalid request body");
    assert.ok(Array.isArray(body.details));
    assert.ok(body.details.length >= 1);
    const paths = body.details.map((d) => d.path);
    assert.ok(paths.includes("name") || paths.includes("age"), "should include path of failing field");
    for (const d of body.details) {
      assert.equal(typeof d.path, "string");
      assert.equal(typeof d.code, "string");
      assert.equal(typeof d.message, "string");
    }
  });
});

describe("validateQuery middleware", () => {
  it("returns 400 with Invalid query parameters and details on failure", () => {
    const schema = z.object({ page: z.coerce.number().int().min(1) });
    const req = { query: { page: "0" } };
    const { res } = makeRes();

    validateQuery(schema)(req as never, res as never, () => { throw new Error("next should NOT be called"); });

    assert.equal(res.statusCode, 400);
    const body = res.body as { error: string; details: unknown[] };
    assert.equal(body.error, "Invalid query parameters");
    assert.ok(Array.isArray(body.details));
    assert.ok(body.details.length >= 1);
  });
});

describe("validateParams middleware", () => {
  it("returns 400 with Invalid path parameters and details on failure", () => {
    const schema = z.object({ id: z.uuid() });
    const req = { params: { id: "not-a-uuid" } };
    const { res } = makeRes();

    validateParams(schema)(req as never, res as never, () => { throw new Error("next should NOT be called"); });

    assert.equal(res.statusCode, 400);
    const body = res.body as { error: string; details: unknown[] };
    assert.equal(body.error, "Invalid path parameters");
    assert.ok(Array.isArray(body.details));
  });

  it("calls next() on success", () => {
    const schema = z.object({ id: z.uuid() });
    const req = { params: { id: "11111111-1111-4111-8111-111111111111" } };
    const { res } = makeRes();
    let nextCalled = false;

    validateParams(schema)(req as never, res as never, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });
});
