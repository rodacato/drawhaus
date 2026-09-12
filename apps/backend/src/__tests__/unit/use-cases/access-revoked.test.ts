import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LogoutUseCase } from "../../../application/use-cases/auth/logout";
import { ResetPasswordUseCase } from "../../../application/use-cases/auth/reset-password";
import { DeleteAccountUseCase } from "../../../application/use-cases/auth/delete-account";
import { AdminUpdateUserUseCase } from "../../../application/use-cases/admin/update-user";
import { AdminDeleteUserUseCase } from "../../../application/use-cases/admin/delete-user";
import { DeleteLinkUseCase } from "../../../application/use-cases/share/delete-link";
import type { AccessRevoked } from "../../../domain/ports/realtime-notifier";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryShareRepository } from "../../fakes/in-memory-share-repository";
import { InMemoryPasswordResetRepository } from "../../fakes/in-memory-password-reset-repository";
import { InMemoryWorkspaceRepository } from "../../fakes/in-memory-workspace-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { NoopAuditLogger } from "../../fakes/noop-audit-logger";
import { FakeRealtimeNotifier } from "../../fakes/fake-realtime-notifier";
import { ExpiredError, ForbiddenError, NotFoundError } from "../../../domain/errors";

type Revoke = { event: AccessRevoked; stillValid: boolean };

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const shares = new InMemoryShareRepository();
  const revokes: Revoke[] = [];
  const notifier = new FakeRealtimeNotifier((event) => {
    revokes.push({ event, stillValid: credentialStillValid(event) });
  });

  function credentialStillValid(event: AccessRevoked): boolean {
    switch (event.kind) {
      case "session":
        return sessions.sessions.some((s) => s.token === event.sessionToken);
      case "user-sessions":
        return sessions.sessions.some(
          (s) => s.userId === event.userId && users.store.some((u) => u.id === s.userId),
        );
      case "share-link":
        return shares.store.some((l) => l.token === event.shareToken);
    }
  }

  async function user(email: string) {
    return users.create({ email, name: email, passwordHash: "hashed_secret" });
  }

  async function admin() {
    const created = await user("admin@x.com");
    await users.adminUpdate(created.id, { role: "admin" });
    return created;
  }

  return { users, sessions, shares, notifier, revokes, user, admin };
}

describe("LogoutUseCase — closing open sockets", () => {
  it("revokes that one session, after it is deleted", async () => {
    const { sessions, notifier, revokes, user } = setup();
    const ada = await user("ada@x.com");
    const leaving = await sessions.create(ada.id);
    const otherTab = await sessions.create(ada.id);

    await new LogoutUseCase(sessions, notifier).execute(leaving.token);

    assert.deepEqual(revokes, [
      { event: { kind: "session", sessionToken: leaving.token }, stillValid: false },
    ]);
    assert.deepEqual(
      sessions.sessions.map((s) => s.token),
      [otherTab.token],
    );
  });

  it("revokes nothing when there was no session cookie", async () => {
    const { sessions, notifier, revokes } = setup();

    await new LogoutUseCase(sessions, notifier).execute(null);

    assert.deepEqual(revokes, []);
  });
});

describe("ResetPasswordUseCase — closing open sockets", () => {
  function resetWith(ctx: ReturnType<typeof setup>) {
    const resetTokens = new InMemoryPasswordResetRepository();
    const useCase = new ResetPasswordUseCase(
      ctx.users,
      ctx.sessions,
      resetTokens,
      new FakeHasher(),
      ctx.notifier,
    );
    return { resetTokens, useCase };
  }

  it("revokes every session of the user, after they are deleted", async () => {
    const ctx = setup();
    const ada = await ctx.user("ada@x.com");
    await ctx.sessions.create(ada.id);
    await ctx.sessions.create(ada.id);
    const { resetTokens, useCase } = resetWith(ctx);
    await resetTokens.create({
      userId: ada.id,
      token: "tok",
      expiresAt: new Date(Date.now() + 3600_000),
    });

    await useCase.execute({ token: "tok", newPassword: "newpass1234" });

    assert.deepEqual(ctx.revokes, [
      { event: { kind: "user-sessions", userId: ada.id }, stillValid: false },
    ]);
  });

  it("revokes nothing when the reset is refused", async () => {
    const ctx = setup();
    const ada = await ctx.user("ada@x.com");
    await ctx.sessions.create(ada.id);
    const { resetTokens, useCase } = resetWith(ctx);
    await resetTokens.create({ userId: ada.id, token: "tok", expiresAt: new Date(Date.now() - 1) });

    await assert.rejects(
      () => useCase.execute({ token: "tok", newPassword: "newpass1234" }),
      (e: unknown) => e instanceof ExpiredError,
    );

    assert.deepEqual(ctx.revokes, []);
  });
});

describe("AdminUpdateUserUseCase — closing open sockets", () => {
  it("revokes every session of a user it disables, after they are deleted", async () => {
    const ctx = setup();
    const actor = await ctx.admin();
    const target = await ctx.user("target@x.com");
    await ctx.sessions.create(target.id);
    const useCase = new AdminUpdateUserUseCase(
      ctx.users,
      ctx.sessions,
      new NoopAuditLogger(),
      ctx.notifier,
    );

    await useCase.execute(target.id, actor.id, { disabled: true });

    assert.deepEqual(ctx.revokes, [
      { event: { kind: "user-sessions", userId: target.id }, stillValid: false },
    ]);
  });

  it("revokes nothing on a role change, a re-enable, or a refused actor", async () => {
    const ctx = setup();
    const actor = await ctx.admin();
    const stranger = await ctx.user("stranger@x.com");
    const target = await ctx.user("target@x.com");
    await ctx.sessions.create(target.id);
    const useCase = new AdminUpdateUserUseCase(
      ctx.users,
      ctx.sessions,
      new NoopAuditLogger(),
      ctx.notifier,
    );

    await useCase.execute(target.id, actor.id, { role: "admin" });
    await useCase.execute(target.id, actor.id, { disabled: false });
    await assert.rejects(
      () => useCase.execute(target.id, stranger.id, { disabled: true }),
      (e: unknown) => e instanceof ForbiddenError,
    );

    assert.deepEqual(ctx.revokes, []);
  });
});

describe("AdminDeleteUserUseCase — closing open sockets", () => {
  it("revokes every session of the deleted user, after the user is gone", async () => {
    const ctx = setup();
    const actor = await ctx.admin();
    const target = await ctx.user("target@x.com");
    await ctx.sessions.create(target.id);
    const useCase = new AdminDeleteUserUseCase(
      ctx.users,
      ctx.sessions,
      new NoopAuditLogger(),
      ctx.notifier,
    );

    await useCase.execute(target.id, actor.id);

    assert.deepEqual(ctx.revokes, [
      { event: { kind: "user-sessions", userId: target.id }, stillValid: false },
    ]);
  });

  it("revokes nothing when the deletion is refused", async () => {
    const ctx = setup();
    const stranger = await ctx.user("stranger@x.com");
    const target = await ctx.user("target@x.com");
    const useCase = new AdminDeleteUserUseCase(
      ctx.users,
      ctx.sessions,
      new NoopAuditLogger(),
      ctx.notifier,
    );

    await assert.rejects(
      () => useCase.execute(target.id, stranger.id),
      (e: unknown) => e instanceof ForbiddenError,
    );

    assert.deepEqual(ctx.revokes, []);
  });
});

describe("DeleteAccountUseCase — closing open sockets", () => {
  it("revokes every session of the user once the user row, and with it the sessions, is gone", async () => {
    const ctx = setup();
    const ada = await ctx.user("ada@x.com");
    await ctx.sessions.create(ada.id);
    const useCase = new DeleteAccountUseCase(
      ctx.users,
      new FakeHasher(),
      new NoopAuditLogger(),
      new InMemoryWorkspaceRepository(),
      ctx.notifier,
    );

    await useCase.execute(ada.id, "secret");

    assert.deepEqual(ctx.revokes, [
      { event: { kind: "user-sessions", userId: ada.id }, stillValid: false },
    ]);
  });

  it("revokes nothing when the password is wrong", async () => {
    const ctx = setup();
    const ada = await ctx.user("ada@x.com");
    const useCase = new DeleteAccountUseCase(
      ctx.users,
      new FakeHasher(),
      new NoopAuditLogger(),
      new InMemoryWorkspaceRepository(),
      ctx.notifier,
    );

    await assert.rejects(() => useCase.execute(ada.id, "wrong"));

    assert.deepEqual(ctx.revokes, []);
  });
});

describe("DeleteLinkUseCase — closing open sockets", () => {
  async function linkOf(ctx: ReturnType<typeof setup>, ownerId: string) {
    return ctx.shares.create({
      diagramId: "11111111-1111-4111-8111-111111111111",
      createdBy: ownerId,
      role: "editor",
      expiresAt: null,
    });
  }

  it("revokes the deleted link, after it is deleted", async () => {
    const ctx = setup();
    const owner = await ctx.user("owner@x.com");
    const link = await linkOf(ctx, owner.id);

    await new DeleteLinkUseCase(ctx.shares, ctx.notifier).execute(link.token, owner.id);

    assert.deepEqual(ctx.revokes, [
      { event: { kind: "share-link", shareToken: link.token }, stillValid: false },
    ]);
  });

  it("revokes nothing when someone other than its creator tries to delete it", async () => {
    const ctx = setup();
    const owner = await ctx.user("owner@x.com");
    const stranger = await ctx.user("stranger@x.com");
    const link = await linkOf(ctx, owner.id);

    await assert.rejects(
      () => new DeleteLinkUseCase(ctx.shares, ctx.notifier).execute(link.token, stranger.id),
      (e: unknown) => e instanceof NotFoundError,
    );

    assert.deepEqual(ctx.revokes, []);
  });
});
