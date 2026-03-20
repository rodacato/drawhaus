import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RegisterUseCase } from "../../../application/use-cases/auth/register";
import { LoginUseCase } from "../../../application/use-cases/auth/login";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";
import { UnauthorizedError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const hasher = new FakeHasher();
  const register = new RegisterUseCase(users, sessions, hasher);
  const login = new LoginUseCase(users, sessions, hasher, new NoopAuditLogger());
  return { users, sessions, register, login };
}

describe("LoginUseCase", () => {
  it("returns user and session on valid credentials", async () => {
    const { register, login } = setup();
    await register.execute({ email: "a@b.com", name: "A", password: "pass1234" });

    const result = await login.execute({ email: "a@b.com", password: "pass1234" });
    assert.equal(result.user.email, "a@b.com");
    assert.ok(result.sessionToken);
  });

  it("rejects wrong password", async () => {
    const { register, login } = setup();
    await register.execute({ email: "a@b.com", name: "A", password: "pass1234" });

    await assert.rejects(
      () => login.execute({ email: "a@b.com", password: "wrongpass" }),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });

  it("rejects unknown email", async () => {
    const { login } = setup();
    await assert.rejects(
      () => login.execute({ email: "nobody@b.com", password: "pass1234" }),
      (err: unknown) => err instanceof UnauthorizedError,
    );
  });
});
