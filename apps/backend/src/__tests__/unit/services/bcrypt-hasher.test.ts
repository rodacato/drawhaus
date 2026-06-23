import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BcryptHasher } from "../../../infrastructure/services/bcrypt-hasher";

describe("BcryptHasher", () => {
  it("hash returns a string different from the plaintext", async () => {
    const hasher = new BcryptHasher();
    const hashed = await hasher.hash("password123");

    assert.equal(typeof hashed, "string");
    assert.notEqual(hashed, "password123");
    assert.ok(hashed.length > 0);
  });

  it("hash returns different output for the same plaintext on each call", async () => {
    const hasher = new BcryptHasher();
    const a = await hasher.hash("password123");
    const b = await hasher.hash("password123");

    assert.notEqual(a, b);
  });

  it("verify returns true for a hash of the matching plaintext", async () => {
    const hasher = new BcryptHasher();
    const hashed = await hasher.hash("password123");

    assert.equal(await hasher.verify("password123", hashed), true);
  });

  it("verify returns false for a wrong plaintext", async () => {
    const hasher = new BcryptHasher();
    const hashed = await hasher.hash("password123");

    assert.equal(await hasher.verify("password456", hashed), false);
  });

  it("verify returns false for an invalid hash without throwing", async () => {
    const hasher = new BcryptHasher();

    assert.equal(await hasher.verify("password123", "not-a-real-bcrypt-hash"), false);
  });
});
