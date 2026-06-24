import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DeleteAccountUseCase } from "../../../application/use-cases/auth/delete-account";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../../domain/errors";
import type { AuditEvent, AuditLogger } from "../../../domain/ports/audit-logger";

class RecordingAuditLogger implements AuditLogger {
  events: AuditEvent[] = [];
  log(event: AuditEvent): void {
    this.events.push(event);
  }
}

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakeHasher();
  const audit = new RecordingAuditLogger();
  const workspaces = new InMemoryWorkspaceRepository();
  const useCase = new DeleteAccountUseCase(users, hasher, audit, workspaces);
  return { users, hasher, audit, workspaces, useCase };
}

describe("DeleteAccountUseCase", () => {
  it("verifies password and deletes the user (happy path with password)", async () => {
    const { users, audit, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_secret" });

    await useCase.execute(user.id, "secret");

    assert.equal(users.store.length, 0);
    assert.equal(audit.events.length, 1);
    assert.equal(audit.events[0].action, "user.delete_account");
    assert.equal(audit.events[0].actor, user.id);
  });

  it("deletes OAuth-only user (no password) without password verification", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: null,
      googleId: "g-1",
    });

    await useCase.execute(user.id, null);

    assert.equal(users.store.length, 0);
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("missing-id", "any"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws UnauthorizedError and audits the denial when user has password but null was passed", async () => {
    const { users, audit, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_secret" });

    await assert.rejects(
      () => useCase.execute(user.id, null),
      (err: unknown) => err instanceof UnauthorizedError,
    );
    assert.equal(users.store.length, 1);
    assert.equal(audit.events.length, 1);
    assert.equal(audit.events[0].action, "user.delete_account.denied");
    assert.equal(audit.events[0].actor, user.id);
    assert.deepEqual(audit.events[0].meta, { reason: "missing_password" });
  });

  it("throws UnauthorizedError and audits the denial on wrong password", async () => {
    const { users, audit, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_secret" });

    await assert.rejects(
      () => useCase.execute(user.id, "wrong"),
      (err: unknown) => err instanceof UnauthorizedError,
    );
    assert.equal(users.store.length, 1);
    assert.equal(audit.events.length, 1);
    assert.equal(audit.events[0].action, "user.delete_account.denied");
    assert.deepEqual(audit.events[0].meta, { reason: "wrong_password" });
  });

  it("throws ConflictError and audits the denial when user owns shared workspaces", async () => {
    const { users, workspaces, audit, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_secret" });
    const workspace = await workspaces.create({ name: "Team", ownerId: user.id });
    await workspaces.addMember(workspace.id, "other-user", "editor");

    await assert.rejects(
      () => useCase.execute(user.id, "secret"),
      (err: unknown) => err instanceof ConflictError,
    );
    assert.equal(users.store.length, 1);
    assert.equal(audit.events.length, 1);
    assert.equal(audit.events[0].action, "user.delete_account.denied");
    assert.equal(audit.events[0].meta?.reason, "owns_shared_workspaces");
    assert.equal(audit.events[0].meta?.count, 1);
  });

  it("records the audit log BEFORE deleting the user", async () => {
    const { users, audit, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "hashed_secret" });

    const originalDelete = users.delete.bind(users);
    let auditCountAtDelete = -1;
    users.delete = async (id: string) => {
      auditCountAtDelete = audit.events.length;
      return originalDelete(id);
    };

    await useCase.execute(user.id, "secret");

    assert.equal(auditCountAtDelete, 1);
  });
});
