import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ForgotPasswordUseCase } from "../../../application/use-cases/auth/forgot-password";
import { InMemoryUserRepository } from "../../fakes/in-memory-user-repository";
import { InMemoryPasswordResetRepository } from "../../fakes/in-memory-password-reset-repository";
import type { EmailService } from "../../../domain/ports/email-service";

class RecordingEmailService implements EmailService {
  resetCalls: { to: string; token: string }[] = [];
  async sendInviteEmail(): Promise<void> {}
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    this.resetCalls.push({ to, token: resetToken });
  }
  async sendWorkspaceInviteEmail(): Promise<void> {}
}

function setup() {
  const users = new InMemoryUserRepository();
  const resetTokens = new InMemoryPasswordResetRepository();
  const emailService = new RecordingEmailService();
  const useCase = new ForgotPasswordUseCase(users, resetTokens, emailService);
  return { users, resetTokens, emailService, useCase };
}

describe("ForgotPasswordUseCase", () => {
  it("creates a reset token and emails it when the user exists", async () => {
    const { users, resetTokens, emailService, useCase } = setup();
    const user = await users.create({ email: "u@example.com", name: "U", passwordHash: "h" });

    await useCase.execute("u@example.com");

    assert.equal(resetTokens.store.length, 1);
    assert.equal(resetTokens.store[0].userId, user.id);
    assert.equal(emailService.resetCalls.length, 1);
    assert.equal(emailService.resetCalls[0].to, "u@example.com");
    assert.equal(emailService.resetCalls[0].token, resetTokens.store[0].token);
  });

  it("does NOT leak user existence: unknown email yields no token and no email", async () => {
    const { resetTokens, emailService, useCase } = setup();

    await useCase.execute("nobody@example.com");

    assert.equal(resetTokens.store.length, 0);
    assert.equal(emailService.resetCalls.length, 0);
  });

  it("lowercases the email before lookup (case-insensitive match)", async () => {
    const { users, resetTokens, emailService, useCase } = setup();
    await users.create({ email: "mixed@example.com", name: "U", passwordHash: "h" });

    await useCase.execute("MiXeD@Example.COM");

    assert.equal(resetTokens.store.length, 1);
    assert.equal(emailService.resetCalls.length, 1);
  });

  it("generates a base64url token of the expected length (32 bytes -> 43 chars)", async () => {
    const { users, resetTokens, useCase } = setup();
    await users.create({ email: "u@example.com", name: "U", passwordHash: "h" });

    await useCase.execute("u@example.com");

    const token = resetTokens.store[0].token;
    assert.equal(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });
});
