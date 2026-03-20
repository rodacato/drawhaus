import crypto from "crypto";
import type { ApiKeyRepository } from "../../domain/ports/api-key-repository";
import type { ApiKey } from "../../domain/entities/api-key";

export class InMemoryApiKeyRepository implements ApiKeyRepository {
  store: ApiKey[] = [];
  logs: { keyId: string; method: string; path: string; statusCode: number; ip: string | null; userAgent: string | null }[] = [];

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return this.store.find((k) => k.keyHash === keyHash) ?? null;
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    return this.store.filter((k) => k.userId === userId);
  }

  async findById(id: string): Promise<ApiKey | null> {
    return this.store.find((k) => k.id === id) ?? null;
  }

  async create(data: {
    userId: string;
    workspaceId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    expiresAt: Date | null;
  }): Promise<ApiKey> {
    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      userId: data.userId,
      workspaceId: data.workspaceId,
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    };
    this.store.push(apiKey);
    return apiKey;
  }

  async revoke(id: string): Promise<void> {
    const key = this.store.find((k) => k.id === id);
    if (key) key.revokedAt = new Date();
  }

  async updateLastUsed(id: string): Promise<void> {
    const key = this.store.find((k) => k.id === id);
    if (key) key.lastUsedAt = new Date();
  }

  async countActiveByUser(userId: string): Promise<number> {
    const now = new Date();
    return this.store.filter(
      (k) => k.userId === userId && !k.revokedAt && (!k.expiresAt || k.expiresAt > now),
    ).length;
  }

  logRequest(data: {
    keyId: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string | null;
    userAgent: string | null;
  }): void {
    this.logs.push(data);
  }
}
