import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AcceptInviteUseCase } from "../../../application/use-cases/auth/accept-invite";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../../fakes/in-memory-session-repository";
import { InMemoryInvitationRepository } from "../../fakes/in-memory-invitation-repository";
import { FakeHasher } from "../../fakes/fake-hasher";
import { ConflictError, ExpiredError, NotFoundError } from "../../../domain/errors";

function setup() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(() => users.store);
  const invitations = new InMemoryInvitationRepository();
  const hasher = new FakeHasher();
  const useCase = new AcceptInviteUseCase(users, sessions, invitations, hasher);
  return { users, sessions, invitations, hasher, useCase };
}

async function createInvite(
  invitations: InMemoryInvitationRepository,
  overrides: { email?: string; role?: "admin" | "user"; token?: string; expiresAt?: Date } = {},
) {
  return invitations.create({
    email: overrides.email ?? "invitee@example.com",
    role: overrides.role ?? "user",
    token: overrides.token ?? "invite-token",
    invitedBy: "inviter-id",
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86400_000),
  });
}

describe("AcceptInviteUseCase", () => {
  describe("resolve", () => {
    it("returns email and role for a valid invitation", async () => {
      const { invitations, useCase } = setup();
      await createInvite(invitations, { email: "joe@example.com", role: "admin" });

      const result = await useCase.resolve("invite-token");

      assert.deepEqual(result, { email: "joe@example.com", role: "admin" });
    });

    it("throws NotFoundError for unknown token", async () => {
      const { useCase } = setup();

      await assert.rejects(
        () => useCase.resolve("nope"),
        (err: unknown) => err instanceof NotFoundError,
      );
    });

    it("throws ConflictError if invitation already used", async () => {
      const { invitations, useCase } = setup();
      const invite = await createInvite(invitations);
      await invitations.markUsed(invite.id);

      await assert.rejects(
        () => useCase.resolve("invite-token"),
        (err: unknown) => err instanceof ConflictError,
      );
    });

    it("throws ExpiredError if past expiresAt", async () => {
      const { invitations, useCase } = setup();
      await createInvite(invitations, { expiresAt: new Date(Date.now() - 1000) });

      await assert.rejects(
        () => useCase.resolve("invite-token"),
        (err: unknown) => err instanceof ExpiredError,
      );
    });
  });

  describe("execute", () => {
    it("creates user, marks invitation used, and returns a session", async () => {
      const { users, sessions, invitations, useCase } = setup();
      const invite = await createInvite(invitations, { email: "newuser@example.com" });

      const result = await useCase.execute({ token: "invite-token", name: "New User", password: "pw12345678" });

      assert.equal(users.store.length, 1);
      assert.equal(users.store[0].email, "newuser@example.com");
      assert.equal(users.store[0].name, "New User");
      assert.equal(users.store[0].role, "user");
      assert.equal(sessions.sessions.length, 1);
      assert.equal(result.sessionToken, sessions.sessions[0].token);
      assert.equal(result.user.email, "newuser@example.com");
      const stored = invitations.store.find((i) => i.id === invite.id);
      assert.ok(stored?.usedAt);
    });

    it("applies admin role via adminUpdate when invitation.role is admin", async () => {
      const { users, invitations, useCase } = setup();
      await createInvite(invitations, { role: "admin" });

      const result = await useCase.execute({ token: "invite-token", name: "Admin", password: "pw12345678" });

      assert.equal(users.store[0].role, "admin");
      assert.equal(result.user.role, "admin");
    });

    it("throws ConflictError if an account already exists for the invitation email", async () => {
      const { users, invitations, useCase } = setup();
      await createInvite(invitations, { email: "dup@example.com" });
      await users.create({ email: "dup@example.com", name: "Existing", passwordHash: "h" });

      await assert.rejects(
        () => useCase.execute({ token: "invite-token", name: "X", password: "pw12345678" }),
        (err: unknown) => err instanceof ConflictError,
      );
    });

    it("hashes the password via the injected hasher", async () => {
      const { users, invitations, useCase } = setup();
      await createInvite(invitations);

      await useCase.execute({ token: "invite-token", name: "X", password: "pw12345678" });

      assert.equal(users.store[0].passwordHash, "hashed_pw12345678");
    });
  });
});
