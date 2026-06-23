import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "../../../infrastructure/services/encryption";

const TEST_KEY = randomBytes(32).toString("hex");

describe("encryption", () => {
  it("encrypt returns ciphertext different from the plaintext", () => {
    const result = encrypt("secret-value", TEST_KEY);

    assert.notEqual(result.encrypted, "secret-value");
    assert.ok(result.encrypted.length > 0);
    assert.ok(result.iv.length > 0);
    assert.ok(result.authTag.length > 0);
  });

  it("encrypt returns different ciphertext on each call due to randomized IV", () => {
    const a = encrypt("secret-value", TEST_KEY);
    const b = encrypt("secret-value", TEST_KEY);

    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.encrypted, b.encrypted);
  });

  it("decrypt round-trips the original plaintext", () => {
    const plaintext = "my-integration-secret-token";
    const encrypted = encrypt(plaintext, TEST_KEY);

    assert.equal(decrypt(encrypted, TEST_KEY), plaintext);
  });

  it("decrypt round-trips multi-byte unicode plaintext", () => {
    const plaintext = "contraseña-con-emoji-🔐-and-中文";
    const encrypted = encrypt(plaintext, TEST_KEY);

    assert.equal(decrypt(encrypted, TEST_KEY), plaintext);
  });

  it("decrypt throws when ciphertext is tampered", () => {
    const encrypted = encrypt("secret-value", TEST_KEY);
    const tampered = {
      ...encrypted,
      encrypted: Buffer.from("00000000", "hex").toString("base64"),
    };

    assert.throws(() => decrypt(tampered, TEST_KEY));
  });

  it("decrypt throws when auth tag is tampered", () => {
    const encrypted = encrypt("secret-value", TEST_KEY);
    const tampered = {
      ...encrypted,
      authTag: Buffer.alloc(16, 0).toString("base64"),
    };

    assert.throws(() => decrypt(tampered, TEST_KEY));
  });

  it("decrypt throws when using a different key", () => {
    const encrypted = encrypt("secret-value", TEST_KEY);
    const otherKey = randomBytes(32).toString("hex");

    assert.throws(() => decrypt(encrypted, otherKey));
  });

  it("encrypt throws when key is not 64 hex characters", () => {
    assert.throws(() => encrypt("secret-value", "abcd"), /ENCRYPTION_KEY must be exactly 64 hex characters/);
  });

  it("decrypt throws when key is not 64 hex characters", () => {
    const encrypted = encrypt("secret-value", TEST_KEY);

    assert.throws(() => decrypt(encrypted, "abcd"), /ENCRYPTION_KEY must be exactly 64 hex characters/);
  });
});
