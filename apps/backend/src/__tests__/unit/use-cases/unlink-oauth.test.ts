import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UnlinkOAuthUseCase } from "../../../application/use-cases/auth/unlink-oauth";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemoryOAuthTokenRepository } from "../../fakes/in-memory-oauth-token-repository";
import { InMemoryDriveBackupRepository } from "../../fakes/in-memory-drive-backup-repository";
import { InvalidInputError, NotFoundError } from "../../../domain/errors";

function setup(opts: { withDriveBackup?: boolean } = {}) {
  const users = new InMemoryUserRepository();
  const oauthTokens = new InMemoryOAuthTokenRepository();
  const driveBackupRepo = opts.withDriveBackup ? new InMemoryDriveBackupRepository() : undefined;
  const useCase = new UnlinkOAuthUseCase(users, oauthTokens, driveBackupRepo);
  return { users, oauthTokens, driveBackupRepo, useCase };
}

describe("UnlinkOAuthUseCase", () => {
  it("unlinks google: clears googleId, deletes oauth token, deletes drive backup settings", async () => {
    const { users, oauthTokens, driveBackupRepo, useCase } = setup({ withDriveBackup: true });
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_pw",
      googleId: "g-123",
    });
    await oauthTokens.upsert({
      userId: user.id,
      provider: "google",
      accessToken: "at",
      scopes: "https://www.googleapis.com/auth/drive.file",
    });
    await driveBackupRepo!.upsertSettings(user.id, { enabled: true });

    await useCase.execute(user.id, "google");

    assert.equal(users.store[0].googleId, null);
    assert.equal(oauthTokens.store.length, 0);
    assert.equal(driveBackupRepo!.settings.get(user.id), undefined);
  });

  it("unlinks github: clears githubId AND githubUsername, deletes oauth token", async () => {
    const { users, oauthTokens, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_pw",
      githubId: "gh-123",
      githubUsername: "octocat",
    });
    await oauthTokens.upsert({
      userId: user.id,
      provider: "github",
      accessToken: "at",
      scopes: "read:user",
    });

    await useCase.execute(user.id, "github");

    assert.equal(users.store[0].githubId, null);
    assert.equal(users.store[0].githubUsername, null);
    assert.equal(oauthTokens.store.length, 0);
  });

  it("throws NotFoundError when the user doesn't exist", async () => {
    const { useCase } = setup();

    await assert.rejects(
      () => useCase.execute("missing-id", "google"),
      (err: unknown) => err instanceof NotFoundError,
    );
  });

  it("throws InvalidInputError when unlinking would leave the user with zero auth methods", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: null,
      googleId: "g-only",
    });

    await assert.rejects(
      () => useCase.execute(user.id, "google"),
      (err: unknown) => err instanceof InvalidInputError,
    );
    assert.equal(users.store[0].googleId, "g-only");
  });

  it("allows unlink when methodCount > 1 (password + google -> unlink google)", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_pw",
      googleId: "g-123",
    });

    await useCase.execute(user.id, "google");

    assert.equal(users.store[0].googleId, null);
    assert.equal(users.store[0].passwordHash, "hashed_pw");
  });

  it("works for google unlink without driveBackupRepo injected (no crash)", async () => {
    const { users, useCase } = setup();
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_pw",
      googleId: "g-123",
    });

    await useCase.execute(user.id, "google");

    assert.equal(users.store[0].googleId, null);
  });

  it("does NOT touch drive backup settings when unlinking github", async () => {
    const { users, driveBackupRepo, useCase } = setup({ withDriveBackup: true });
    const user = await users.create({
      email: "u@example.com",
      name: "U",
      passwordHash: "hashed_pw",
      githubId: "gh-1",
      githubUsername: "octo",
    });
    await driveBackupRepo!.upsertSettings(user.id, { enabled: true });

    await useCase.execute(user.id, "github");

    assert.ok(driveBackupRepo!.settings.get(user.id));
  });
});
