import crypto from "node:crypto";
import type { ApiKeyRepository } from "../../../domain/ports/api-key-repository";
import type { UserRepository } from "../../../domain/ports/user-repository";
import { isApiKeyActive } from "../../../domain/entities/api-key";
import { UnauthorizedError } from "../../../domain/errors";

export class ValidateApiKeyUseCase {
  constructor(
    private apiKeys: ApiKeyRepository,
    private users: UserRepository,
  ) {}

  async execute(rawKey: string) {
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.apiKeys.findByKeyHash(keyHash);

    if (!apiKey || !isApiKeyActive(apiKey)) {
      throw new UnauthorizedError();
    }

    const user = await this.users.findById(apiKey.userId);
    if (!user || user.disabled) {
      throw new UnauthorizedError();
    }

    // Debounced last_used_at update (fire-and-forget)
    this.apiKeys.updateLastUsed(apiKey.id).catch(() => {});

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        disabled: user.disabled,
      },
      workspaceId: apiKey.workspaceId,
      apiKeyId: apiKey.id,
    };
  }
}
