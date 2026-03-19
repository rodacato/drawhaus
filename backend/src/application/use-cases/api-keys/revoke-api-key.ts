import type { ApiKeyRepository } from "../../../domain/ports/api-key-repository";
import { NotFoundError, ForbiddenError } from "../../../domain/errors";

export class RevokeApiKeyUseCase {
  constructor(private apiKeys: ApiKeyRepository) {}

  async execute(keyId: string, userId: string) {
    const key = await this.apiKeys.findById(keyId);
    if (!key) {
      throw new NotFoundError("API key");
    }
    if (key.userId !== userId) {
      throw new ForbiddenError();
    }
    await this.apiKeys.revoke(keyId);
  }
}
