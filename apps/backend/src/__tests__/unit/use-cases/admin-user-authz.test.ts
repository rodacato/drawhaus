import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AdminDeleteUserUseCase } from "../../../application/use-cases/admin/delete-user";
import { AdminUpdateUserUseCase } from "../../../application/use-cases/admin/update-user";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";
import { ForbiddenError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const audit = new NoopAuditLogger();
  return {
    users,
    deleteUser: new AdminDeleteUserUseCase(users, sessions, audit),
    updateUser: new AdminUpdateUserUseCase(users, sessions, audit),
  };
}

describe("admin user use cases — actor must be an admin", () => {
  it("delete-user throws ForbiddenError when the actor is not an admin", async () => {
    const { users, deleteUser } = setup();
    const actor = await users.create({ email: "actor@x.com", name: "Actor", passwordHash: "h" });
    const target = await users.create({ email: "target@x.com", name: "Target", passwordHash: "h" });

    await assert.rejects(() => deleteUser.execute(target.id, actor.id), (e: unknown) => e instanceof ForbiddenError);
    assert.equal(users.store.length, 2);
  });

  it("update-user throws ForbiddenError when the actor is not an admin", async () => {
    const { users, updateUser } = setup();
    const actor = await users.create({ email: "actor@x.com", name: "Actor", passwordHash: "h" });
    const target = await users.create({ email: "target@x.com", name: "Target", passwordHash: "h" });

    await assert.rejects(
      () => updateUser.execute(target.id, actor.id, { disabled: true }),
      (e: unknown) => e instanceof ForbiddenError,
    );
  });

  it("delete-user proceeds when the actor is an admin", async () => {
    const { users, deleteUser } = setup();
    const actor = await users.create({ email: "admin@x.com", name: "Admin", passwordHash: "h" });
    await users.adminUpdate(actor.id, { role: "admin" });
    const target = await users.create({ email: "target@x.com", name: "Target", passwordHash: "h" });

    await deleteUser.execute(target.id, actor.id);
    assert.equal(users.store.find((u) => u.id === target.id), undefined);
  });
});
