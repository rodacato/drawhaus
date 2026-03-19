import type { ApiKeyRepository } from "../../../domain/ports/api-key-repository";

export class ListApiKeysUseCase {
  constructor(private apiKeys: ApiKeyRepository) {}

  async execute(userId: string) {
    return this.apiKeys.findByUserId(userId);
  }
}
