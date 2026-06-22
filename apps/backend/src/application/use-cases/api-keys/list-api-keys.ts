import type { ApiKeyRepository } from "../../../domain/ports/api-key-repository";

export class ListApiKeysUseCase {
  constructor(private readonly apiKeys: ApiKeyRepository) {}

  async execute(userId: string) {
    return this.apiKeys.findByUserId(userId);
  }
}
