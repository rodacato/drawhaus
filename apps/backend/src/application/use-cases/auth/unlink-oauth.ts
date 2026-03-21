import type { UserRepository } from "../../../domain/ports/user-repository";
import type { OAuthTokenRepository } from "../../../domain/ports/oauth-token-repository";
import { NotFoundError } from "../../../domain/errors";

export class UnlinkOAuthUseCase {
  constructor(
    private users: UserRepository,
    private oauthTokens: OAuthTokenRepository,
  ) {}

  async execute(userId: string, provider: "google" | "github"): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("User");

    // Count available auth methods
    const hasPassword = !!user.passwordHash;
    const hasGoogle = !!user.googleId;
    const hasGitHub = !!user.githubId;
    const methodCount = (hasPassword ? 1 : 0) + (hasGoogle ? 1 : 0) + (hasGitHub ? 1 : 0);

    if (methodCount <= 1) {
      throw new Error("Cannot unlink your only authentication method");
    }

    if (provider === "google") {
      await this.users.update(userId, { googleId: null });
    } else {
      await this.users.update(userId, { githubId: null, githubUsername: null });
    }

    await this.oauthTokens.deleteByUserAndProvider(userId, provider);
  }
}
