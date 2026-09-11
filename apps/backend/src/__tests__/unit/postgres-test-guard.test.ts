import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertTestDatabase, prepareTestDatabase } from "../postgres/test-database";

describe("Postgres test database guard", () => {
  it("accepts a database whose name ends with _test", () => {
    assert.equal(
      assertTestDatabase("postgres://drawhaus:drawhaus@db:5432/drawhaus_test"),
      "drawhaus_test",
    );
  });

  for (const url of [
    "postgres://drawhaus:drawhaus@db:5432/drawhaus",
    "postgres://drawhaus:drawhaus@db:5432/postgres",
    "postgres://drawhaus:drawhaus@db:5432/drawhaus_e2e",
    "postgres://drawhaus:drawhaus@db:5432/drawhaus_test_copy",
    "postgres://drawhaus:drawhaus@db:5432",
  ]) {
    it(`refuses ${url}`, () => {
      assert.throws(() => assertTestDatabase(url), /must end with _test/);
    });
  }

  it("refuses before opening a connection", async () => {
    // Port 1 refuses connections: any attempt to connect would surface as ECONNREFUSED instead.
    await assert.rejects(
      prepareTestDatabase("postgres://drawhaus:drawhaus@127.0.0.1:1/drawhaus"),
      /Refusing to run Postgres tests against database "drawhaus"/,
    );
  });
});
