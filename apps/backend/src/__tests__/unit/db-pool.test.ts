import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../infrastructure/db";

describe("db pool", () => {
  it("bounds how long a connection attempt can take", () => {
    const timeout = (pool.options as { connectionTimeoutMillis?: number }).connectionTimeoutMillis;
    assert.ok(
      typeof timeout === "number" && timeout > 0,
      "pool must set connectionTimeoutMillis; without it an unreachable host holds the process open forever",
    );
  });
});
